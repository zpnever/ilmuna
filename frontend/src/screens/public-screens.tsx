import { useEffect, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { Link, useNavigate } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, BookHeart, Compass, Globe, LockKeyhole, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Badge, Button, Card, Input, SectionHeading } from '@/components/ui'
import { useAuth } from '@/context/auth-context'

export function LandingScreen() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const workingWays: Array<{ icon: LucideIcon; title: string; description: string }> = [
    { icon: Compass, title: 'Follow seperlunya', description: 'Pilih siapa yang ingin Anda jadikan arus utama di feed.' },
    { icon: Users, title: 'Masuk ke grup', description: 'Komunitas bisa publik atau privat dengan persetujuan pengelola.' },
    { icon: BookHeart, title: 'Simpan rujukan', description: 'Bookmark ayat dan hadith penting langsung dari backend referensi.' },
    { icon: Globe, title: 'Jelajah saat perlu', description: 'Explore memuat bertahap agar discovery tetap terukur.' },
    { icon: LockKeyhole, title: 'Sesi aman', description: 'Autentikasi Google dan sesi browser dijaga lewat cookie.' },
  ]

  return (
    <div className="min-h-screen overflow-hidden">
      <section className="pattern-grid relative isolate px-4 py-6 sm:px-6">
        <div className="mx-auto grid min-h-[88vh] max-w-[1320px] gap-10 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <Badge variant="gold" className="px-4 py-2 text-[11px] tracking-[0.28em] uppercase">
              Platform Pengajian dan Komunitas
            </Badge>
            <div className="space-y-6">
              <h1 className="max-w-4xl text-5xl font-semibold leading-none tracking-tight text-ink-900 sm:text-6xl lg:text-7xl">
                Belajar bersama, berbagi dengan adab, dan merujuk langsung ke sumber.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-ink-600">
                Ilmuna menyatukan feed yang fokus, grup pengajian, serta referensi Al-Qur&apos;an dan Hadith dalam satu pengalaman web yang ringan.
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
                <Link to="/references">Lihat referensi</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ['Feed fokus', 'Feed hanya berisi postingan dari akun yang Anda follow.'],
                ['Explore terpisah', 'Konten populer dan discovery berada di ruang eksplorasi tersendiri.'],
                ['Grup + LMS', 'Forum, materi, tugas, dan review ada dalam satu komunitas.'],
              ].map(([title, desc]) => (
                <Card key={title} className="p-4">
                  <p className="text-sm font-semibold text-ink-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <Card className="space-y-6">
              <SectionHeading eyebrow="Cara kerja" title="Belajar tetap rapi dan terarah" />
              <div className="space-y-4">
                {workingWays.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="flex gap-4 rounded-[1.75rem] bg-black/3 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold-400/15 text-gold-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink-900">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}

function AuthCard({
  title,
  description,
  allowPasswordLogin = false,
}: {
  title: string
  description: string
  allowPasswordLogin?: boolean
}) {
  const navigate = useNavigate()
  const { isAuthenticated, loginWithEmail, loginWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: '/feed' })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">Ilmuna</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">{title}</h1>
          <p className="text-sm leading-7 text-ink-500">{description}</p>
        </div>
        {allowPasswordLogin ? (
          <div className="space-y-3 rounded-[1.75rem] border border-black/8 bg-black/[0.02] p-4">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
            />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
            <Button
              className="w-full"
              disabled={!email.trim() || !password.trim()}
              onClick={() => {
                void loginWithEmail(email, password)
                  .then(async () => {
                    await navigate({ to: '/feed' })
                  })
                  .catch((error: Error) => {
                    toast.error(error.message)
                  })
              }}
            >
              Masuk
            </Button>
          </div>
        ) : null}
        <div className="rounded-[1.75rem] border border-black/8 bg-black/[0.02] p-4">
          <GoogleLogin
            width="100%"
            text="continue_with"
            shape="pill"
            onSuccess={(response) => {
              if (!response.credential) {
                toast.error('Kredensial Google tidak diterima.')
                return
              }
              void loginWithGoogle(response.credential)
                .then(async () => {
                  await navigate({ to: '/feed' })
                })
                .catch((error: Error) => {
                  toast.error(error.message)
                })
            }}
            onError={() => {
              toast.error('Login Google dibatalkan.')
            }}
          />
        </div>
        <p className="text-sm text-ink-500">
          Dengan masuk, Anda menyetujui sesi browser aman yang dikelola oleh Ilmuna.
        </p>
      </Card>
    </div>
  )
}

export function LoginScreen() {
  return (
    <AuthCard
      title="Masuk ke Ilmuna"
      description="Masuk dengan email dan password untuk akun yang sudah terdaftar, atau gunakan Google jika akun Anda sudah dihubungkan."
      allowPasswordLogin
    />
  )
}

export function RegisterScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold-500">Ilmuna</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Registrasi belum dibuka</h1>
          <p className="text-sm leading-7 text-ink-500">
            Pembuatan akun baru sedang dinonaktifkan. Jika Anda sudah punya akun, silakan masuk lewat halaman login.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link to="/login">Ke halaman login</Link>
        </Button>
      </Card>
    </div>
  )
}
