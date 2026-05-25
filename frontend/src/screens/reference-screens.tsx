import { Link } from '@tanstack/react-router'
import { BookOpen, Library } from 'lucide-react'

import { Button, Card, SectionHeading } from '@/components/ui'

export function ReferencesHubScreen() {
  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Referensi"
        title="Pilih sumber yang ingin Anda buka"
        description="Semua data referensi dibaca dari backend internal agar tetap ringan di sisi browser."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gold-400/15 text-gold-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-ink-900">Al-Qur&apos;an</h2>
            <p className="text-sm leading-7 text-ink-500">
              Jelajahi surah, buka detail ayat, lalu simpan bookmark penting Anda.
            </p>
          </div>
          <Button asChild>
            <Link to="/quran">Buka Al-Qur&apos;an</Link>
          </Button>
        </Card>
        <Card className="space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gold-400/15 text-gold-500">
            <Library className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-ink-900">Hadith</h2>
            <p className="text-sm leading-7 text-ink-500">
              Pilih kitab hadith dan lanjutkan membaca per 40 entri secara bertahap.
            </p>
          </div>
          <Button asChild>
            <Link to="/hadith">Buka Hadith</Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}
