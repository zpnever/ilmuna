import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowRight, BookHeart, Compass, Globe, LockKeyhole, Sparkles, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Card, Input, SectionHeading } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import { DEMO_CREDENTIALS } from '@/data/seed'
import { getSurahDetail } from '@/services/quran-service'

export function LandingScreen() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const randomSurah = useMemo(() => Math.floor(Math.random() * 114) + 1, [])
  const ayahQuery = useQuery({
    queryKey: ['landing-ayah', randomSurah],
    queryFn: () => getSurahDetail(randomSurah),
  })

  const featuredAyah = useMemo(() => {
    const ayahs = ayahQuery.data?.ayahs ?? []
    if (!ayahs.length) {
      return null
    }
    return ayahs[Math.floor(Math.random() * ayahs.length)]
  }, [ayahQuery.data?.ayahs])

  return (
    <div className="min-h-screen overflow-hidden">
      <section className="pattern-grid relative isolate px-4 py-6 sm:px-6">
        <div className="mx-auto grid min-h-[88vh] max-w-[1320px] gap-10 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <Badge variant="gold" className="px-4 py-2 text-[11px] tracking-[0.28em] uppercase">
              Platform Pengajian & Komunitas Islam Digital
            </Badge>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-tight text-ink-900 sm:text-6xl lg:text-7xl">
                Belajar bersama, berbagi dengan adab, dan merujuk langsung ke sumber.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-ink-600">
                Ilmuna menyatukan grup pengajian privat, feed Islami yang fokus, serta referensi
                Al-Qur'an dan Hadith dalam satu pengalaman web yang ringan dan mobile-first.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => void navigate({ to: isAuthenticated ? '/feed' : '/login' })}
              >
                Masuk ke aplikasi
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link to="/register">Coba registrasi demo</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Feed fokus', 'Postingan hanya dari akun yang Anda follow.'],
                ['Explore terpisah', 'Discovery populer, minat, dan random tidak mencemari feed utama.'],
                ['Referensi hidup', 'Ayat dan hadith bisa dibaca, dibookmark, dan disisipkan ke post.'],
              ].map(([title, desc]) => (
                <Card key={title} className="p-4">
                  <p className="text-sm font-semibold text-ink-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <Card className="pattern-islamic overflow-hidden p-0">
              <div className="border-b border-black/8 px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">Ayat Hari Ini</p>
                <p className="mt-2 text-sm text-ink-500">
                  Satu ayat acak ditampilkan setiap kunjungan landing page.
                </p>
              </div>
              <div className="space-y-4 px-6 py-6">
                {featuredAyah ? (
                  <>
                    <p dir="rtl" className="text-right text-3xl leading-loose text-ink-900">
                      {featuredAyah.arabic}
                    </p>
                    <p className="text-sm leading-7 text-ink-600">{featuredAyah.translation}</p>
                    <Badge variant="outline">
                      {featuredAyah.surahNameLatin} {featuredAyah.ayahNumber}
                    </Badge>
                  </>
                ) : (
                  <p className="text-sm text-ink-500">Memuat ayat acak...</p>
                )}
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="space-y-3">
                <Users className="h-8 w-8 text-gold-500" />
                <p className="text-lg font-semibold text-ink-900">Grup pengajian privat</p>
                <p className="text-sm leading-6 text-ink-500">
                  Forum, materi, tugas hafalan, dan review ustadz dalam satu tempat.
                </p>
              </Card>
              <Card className="space-y-3">
                <BookHeart className="h-8 w-8 text-gold-500" />
                <p className="text-lg font-semibold text-ink-900">Referensi mudah dirujuk</p>
                <p className="text-sm leading-6 text-ink-500">
                  Bookmark Qur'an dan Hadith lengkap dengan catatan pribadi Anda.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[1320px] space-y-8">
          <SectionHeading
            eyebrow="Cara kerja"
            title="Tiga alur utama dalam satu antarmuka"
            description="Arah produk mengikuti PRD: belajar bersama ustadz, berbagi konten Islami, lalu kembali ke sumber untuk verifikasi."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: LockKeyhole,
                title: 'Masuk dan bangun lingkar belajar',
                copy: 'Login demo, follow akun yang relevan, lalu isi feed akan mulai benar-benar personal.',
              },
              {
                icon: Sparkles,
                title: 'Tulis post dengan ayat tersemat',
                copy: 'Composer mendukung rich text, gambar, dan picker /quran untuk menyisipkan kutipan ayat.',
              },
              {
                icon: Compass,
                title: 'Jelajah hanya saat dibutuhkan',
                copy: 'Explore memisahkan konten populer dan discovery agar feed utama tetap fokus dan tenang.',
              },
            ].map((item) => (
              <Card key={item.title} className="space-y-4">
                <item.icon className="h-9 w-9 text-gold-500" />
                <h3 className="text-xl font-semibold text-ink-900">{item.title}</h3>
                <p className="text-sm leading-7 text-ink-500">{item.copy}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export function LoginScreen() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email)
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password)
  const [pending, setPending] = useState(false)

  if (isAuthenticated) {
    void navigate({ to: '/feed' })
  }

  async function handleLogin() {
    setPending(true)
    try {
      await login(email, password)
      toast.success('Login demo berhasil.')
      await navigate({ to: '/feed' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal login.')
    } finally {
      setPending(false)
    }
  }

  async function handleGoogle() {
    setPending(true)
    try {
      await loginWithGoogle()
      toast.success('Google OAuth disimulasikan untuk mode demo.')
      await navigate({ to: '/feed' })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="pattern-islamic flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl space-y-6 p-6 sm:p-8">
        <SectionHeading
          eyebrow="Demo Login"
          title="Masuk ke Ilmuna"
          description="Gunakan kredensial demo atau tombol Google stub untuk mencoba seluruh frontend."
        />
        <div className="rounded-[1.5rem] bg-black px-4 py-4 font-mono text-sm text-white">
          {DEMO_CREDENTIALS.email}
          <br />
          {DEMO_CREDENTIALS.password}
        </div>
        <div className="space-y-4">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Email</span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Password</span>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button disabled={pending} onClick={() => void handleLogin()}>
            Masuk
          </Button>
          <Button disabled={pending} variant="secondary" onClick={() => void handleGoogle()}>
            <Globe className="mr-2 h-4 w-4" />
            Google OAuth
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm text-ink-500">
          <Link to="/register" className="font-semibold text-ink-900 hover:text-gold-500">
            Belum punya akun?
          </Link>
          <Link to="/" className="hover:text-ink-900">
            Kembali ke landing
          </Link>
        </div>
      </Card>
    </div>
  )
}

export function RegisterScreen() {
  return (
    <div className="pattern-grid flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-2xl space-y-6 p-6 sm:p-8">
        <SectionHeading
          eyebrow="Demo Register"
          title="Registrasi disimulasikan"
          description="Di frontend MVP ini, register belum membuat akun baru sungguhan. Flow diarahkan ke verifikasi email demo."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Nama lengkap</span>
            <Input placeholder="Nama Anda" />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Username</span>
            <Input placeholder="username" />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700 md:col-span-2">
            <span>Email</span>
            <Input placeholder="nama@email.com" />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Password</span>
            <Input type="password" placeholder="••••••••" />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Konfirmasi password</span>
            <Input type="password" placeholder="••••••••" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild>
            <Link to="/verify-email">Lanjut verifikasi email</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/login">Sudah punya akun</Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function VerifyEmailScreen() {
  return (
    <div className="pattern-islamic flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl space-y-6 p-8 text-center">
        <Badge variant="gold" className="mx-auto">
          Email Verified
        </Badge>
        <h1 className="text-3xl font-semibold text-ink-900">Email berhasil diverifikasi</h1>
        <p className="text-sm leading-7 text-ink-500">
          Flow verifikasi email pada MVP frontend ini disimulasikan. Anda sekarang bisa masuk menggunakan
          akun demo untuk menguji seluruh aplikasi.
        </p>
        <Button asChild>
          <Link to="/login">Masuk ke Ilmuna</Link>
        </Button>
      </Card>
    </div>
  )
}
