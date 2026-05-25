import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button, Card, Input, SectionHeading, Textarea } from '@/components/ui'
import { useAuth } from '@/context/auth-context'
import { updateMyProfile } from '@/services/profile-service'
import { uploadAvatar, uploadCover } from '@/services/upload-service'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { user, logoutUser, refreshSession } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [interests, setInterests] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifPush, setNotifPush] = useState(true)
  const [notifGroup, setNotifGroup] = useState(true)

  useEffect(() => {
    if (!user) {
      return
    }
    setName(user.name)
    setUsername(user.username)
    setBio(user.bio)
    setLocation(user.location)
    setWebsite(user.website)
    setAvatarUrl(user.avatarUrl)
    setCoverUrl(user.coverUrl)
    setInterests(user.interests.join(', '))
    setIsPrivate(user.isPrivate)
    setNotifEmail(user.notificationPreferences.email)
    setNotifPush(user.notificationPreferences.push)
    setNotifGroup(user.notificationPreferences.group)
  }, [user])

  const mutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        name,
        username,
        bio,
        location,
        website,
        avatarUrl,
        coverUrl,
        interests: interests
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        isPrivate,
        notificationPreferences: {
          email: notifEmail,
          push: notifPush,
          group: notifGroup,
        },
      }),
    onSuccess: async () => {
      await refreshSession()
      toast.success('Pengaturan diperbarui.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const avatarUploadMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (payload) => {
      setAvatarUrl(payload.url)
      toast.success('Foto profil berhasil diunggah.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const coverUploadMutation = useMutation({
    mutationFn: uploadCover,
    onSuccess: (payload) => {
      setCoverUrl(payload.url)
      toast.success('Background profil berhasil diunggah.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Pengaturan"
        title="Kelola akun Anda"
        description="Atur profil dasar, foto, minat, notifikasi, dan privasi akun."
      />
      <Card className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Nama</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Username</span>
            <Input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium text-ink-700">
          <span>Bio</span>
          <Textarea value={bio} onChange={(event) => setBio(event.target.value)} className="rounded-[1.5rem] focus:border-black/8 focus:ring-0" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Lokasi</span>
            <Input value={location} onChange={(event) => setLocation(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Website</span>
            <Input value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Foto profil</span>
            <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  avatarUploadMutation.mutate(file)
                }
              }}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-ink-700">
            <span>Background profil</span>
            <Input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  coverUploadMutation.mutate(file)
                }
              }}
            />
          </label>
        </div>
        <label className="space-y-2 text-sm font-medium text-ink-700">
          <span>Minat</span>
          <Input value={interests} onChange={(event) => setInterests(event.target.value)} placeholder="tafsir, komunitas, akhlak" />
        </label>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-ink-900">Privasi dan notifikasi</h2>
        <label className="flex items-center justify-between rounded-2xl bg-black/3 px-4 py-3">
          <span className="text-sm text-ink-700">Akun private</span>
          <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-black/3 px-4 py-3">
          <span className="text-sm text-ink-700">Email notifikasi</span>
          <input type="checkbox" checked={notifEmail} onChange={(event) => setNotifEmail(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-black/3 px-4 py-3">
          <span className="text-sm text-ink-700">Push notifikasi</span>
          <input type="checkbox" checked={notifPush} onChange={(event) => setNotifPush(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-black/3 px-4 py-3">
          <span className="text-sm text-ink-700">Aktivitas grup</span>
          <input type="checkbox" checked={notifGroup} onChange={(event) => setNotifGroup(event.target.checked)} />
        </label>
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="danger" onClick={() => void logoutUser().then(() => navigate({ to: '/login' }))}>
          Logout
        </Button>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Simpan pengaturan
        </Button>
      </div>
    </div>
  )
}
