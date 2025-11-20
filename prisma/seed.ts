import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create users
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@tax.go.id',
      password: hashedPassword,
      name: 'Administrator',
      role: 'ADMIN'
    }
  })

  const receptionist = await prisma.user.upsert({
    where: { username: 'receptionist' },
    update: {},
    create: {
      username: 'receptionist',
      email: 'receptionist@tax.go.id',
      password: hashedPassword,
      name: 'Siti Aminah',
      role: 'RECEPTIONIST'
    }
  })

  const helpdesk = await prisma.user.upsert({
    where: { username: 'helpdesk' },
    update: {},
    create: {
      username: 'helpdesk',
      email: 'helpdesk@tax.go.id',
      password: hashedPassword,
      name: 'Ahmad Rahman',
      role: 'HELPDESK'
    }
  })

  const tpt1 = await prisma.user.upsert({
    where: { username: 'tpt1' },
    update: {},
    create: {
      username: 'tpt1',
      email: 'tpt1@tax.go.id',
      password: hashedPassword,
      name: 'Budi Santoso',
      role: 'TPT'
    }
  })

  const tpt2 = await prisma.user.upsert({
    where: { username: 'tpt2' },
    update: {},
    create: {
      username: 'tpt2',
      email: 'tpt2@tax.go.id',
      password: hashedPassword,
      name: 'Sari Dewi',
      role: 'TPT'
    }
  })

  const kepalaSeksi = await prisma.user.upsert({
    where: { username: 'kepala_seksi' },
    update: {},
    create: {
      username: 'kepala_seksi',
      email: 'kepala@tax.go.id',
      password: hashedPassword,
      name: 'Dr. Hendro Wicaksono',
      role: 'KEPALA_SEKSI'
    }
  })

  console.log('✅ Users created')

  // Create customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        npwp: '000000000000001',
        name: 'PT Maju Bersama',
        interests: 'Pajak Badan, SPT Tahunan',
        phone: '021-12345678',
        email: 'contact@majubersama.com'
      }
    }),
    prisma.customer.create({
      data: {
        npwp: '000000000000002',
        name: 'CV Sukses Makmur',
        interests: 'Pajak PPN, Faktur Pajak',
        phone: '021-87654321',
        email: 'admin@suksesmakmur.com'
      }
    }),
    prisma.customer.create({
      data: {
        npwp: '000000000000003',
        name: 'Ahmad Susanto',
        interests: 'Pajak Penghasilan, e-Filing',
        phone: '08123456789',
        email: 'ahmad.susanto@email.com'
      }
    }),
    prisma.customer.create({
      data: {
        npwp: '000000000000004',
        name: 'Siti Nurhaliza',
        interests: 'Pajak Kendaraan, STNK',
        phone: '08198765432',
        email: 'siti.nurhaliza@email.com'
      }
    }),
    prisma.customer.create({
      data: {
        npwp: '000000000000005',
        name: 'PT Teknologi Nusantara',
        interests: 'Pajak Digital, e-Commerce',
        phone: '021-55556666',
        email: 'hr@teknus.com'
      }
    })
  ])

  console.log('✅ Customers created')

  // Create service templates
  const templates = await Promise.all([
    prisma.serviceTemplate.create({
      data: {
        category: 'HELPDESK',
        title: 'Informasi Umum Pajak Penghasilan',
        content: 'Informasi umum tentang Pajak Penghasilan (PPh):\n\n- PPh 21: Pajak atas penghasilan dari pekerjaan\n- PPh 22: Pajak atas pembelian barang mewah\n- PPh 23: Pajak atas penghasilan dari modal, jasa, dan hadiah\n- PPh 25: Pajak penghasilan pasal 25 (angsuran pajak)\n- PPh 26: Pajak atas penghasilan dari luar negeri\n\nUntuk informasi lebih detail, silakan kunjungi www.pajak.go.id',
        createdBy: helpdesk.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'HELPDESK',
        title: 'Batas Waktu Pelaporan SPT',
        content: 'Batas waktu pelaporan SPT Tahunan:\n\n- Wajib Pajak Orang Pribadi: 31 Maret\n- Wajib Pajak Badan: 30 April\n- Wajib Pajak Orang Pribadi dengan peredaran bruto tertentu: 31 Maret\n\nKeterlambatan pelaporan SPT akan dikenakan sanksi administrasi sebesar Rp 100.000 per bulan keterlambatan.',
        createdBy: helpdesk.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'HELPDESK',
        title: 'Cara Mendapatkan EFIN',
        content: 'Untuk mendapatkan EFIN (Electronic Filing Identification Number):\n\n1. Siapkan NPWP dan dokumen identitas\n2. Kunjungi KPP terdekat atau kantor pajak\n3. Isi formulir permohonan EFIN\n4. Lakukan verifikasi data\n5. Tunggu proses aktivasi (1-2 hari kerja)\n\nEFIN diperlukan untuk melaporkan SPT secara online.',
        createdBy: helpdesk.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'HELPDESK',
        title: 'Informasi Tarif PPh',
        content: 'Tarif Pajak Penghasilan (PPh) Orang Pribadi:\n\n- Penghasilan sampai Rp 60.000.000: 5%\n- Penghasilan Rp 60.000.001 - Rp 250.000.000: 15%\n- Penghasilan Rp 250.000.001 - Rp 500.000.000: 25%\n- Penghasilan di atas Rp 500.000.000: 30%\n\nTarif ini berlaku untuk SPT 1770.',
        createdBy: helpdesk.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'HELPDESK',
        title: 'Panduan Pembayaran Pajak',
        content: 'Cara membayar pajak:\n\n1. Melalui e-Billing di djponline.pajak.go.id\n2. ATM Bank Persepsi (Bank Mandiri, BNI, BTN, BRI)\n3. Internet Banking\n4. Kantor Pos\n5. Teller Bank\n\nPastikan kode billing masih aktif dan nominal sesuai.',
        createdBy: helpdesk.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'E_FILING',
        title: 'Masalah Login e-Filing',
        content: 'Masalah login e-Filing biasanya disebabkan oleh:\n1. Password yang salah atau kadaluarsa\n2. Browser tidak kompatibel\n3. Cache browser perlu dibersihkan\n4. Pastikan menggunakan browser terbaru\n\nSolusi: Reset password melalui menu lupa password atau hubungi helpdesk.',
        createdBy: tpt1.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'E_BILLING',
        title: 'Error Pembayaran e-Billing',
        content: 'Untuk mengatasi error pembayaran e-Billing:\n1. Pastikan kode billing masih aktif\n2. Periksa nominal pembayaran sesuai\n3. Gunakan browser yang didukung\n4. Coba refresh halaman atau clear cache\n\nJika masih error, dapat menggunakan metode pembayaran lain.',
        createdBy: tpt1.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'SPT_GUIDANCE',
        title: 'Panduan Pengisian SPT 1770',
        content: 'Panduan pengisian SPT 1770:\n1. Siapkan NPWP dan data penghasilan\n2. Isi bagian Identitas Wajib Pajak\n3. Masukkan data penghasilan kotor\n4. Hitung pengurangan dan penghasilan neto\n5. Isi daftar harta dan kewajiban\n6. Periksa dan kirim SPT\n\nPastikan semua data terisi dengan benar.',
        createdBy: tpt2.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'SYSTEM_ACCESS',
        title: 'Akses Sistem DJP Online',
        content: 'Untuk mendapatkan akses sistem DJP Online:\n1. Registrasi akun di djponline.pajak.go.id\n2. Verifikasi email dan nomor telepon\n3. Lengkapi data profil\n4. Aktivasi akun melalui email\n5. Login dengan username dan password\n\nProses aktivasi memakan waktu 1-2 hari kerja.',
        createdBy: tpt1.id
      }
    }),
    prisma.serviceTemplate.create({
      data: {
        category: 'DOCUMENT_UPLOAD',
        title: 'Upload Dokumen Pendukung',
        content: 'Persyaratan upload dokumen:\n1. Format file: PDF, JPG, PNG (max 2MB)\n2. Nama file jelas dan deskriptif\n3. Dokumen asli atau legalized\n4. Pastikan resolusi gambar cukup\n\nJika upload gagal, coba dengan file yang lebih kecil atau format berbeda.',
        createdBy: tpt2.id
      }
    })
  ])

  console.log('✅ Service templates created')

  // Create queue counters for today
  const today = new Date()
  const todayString = today.toISOString().split('T')[0]

  await prisma.queueCounter.upsert({
    where: {
      serviceType_date: {
        serviceType: 'HELPDESK',
        date: today
      }
    },
    update: { currentNumber: 5 },
    create: {
      serviceType: 'HELPDESK',
      currentNumber: 5,
      date: today
    }
  })

  await prisma.queueCounter.upsert({
    where: {
      serviceType_date: {
        serviceType: 'TPT',
        date: today
      }
    },
    update: { currentNumber: 8 },
    create: {
      serviceType: 'TPT',
      currentNumber: 8,
      date: today
    }
  })

  await prisma.queueCounter.upsert({
    where: {
      serviceType_date: {
        serviceType: 'BOTH',
        date: today
      }
    },
    update: { currentNumber: 2 },
    create: {
      serviceType: 'BOTH',
      currentNumber: 2,
      date: today
    }
  })

  console.log('✅ Queue counters initialized')

  // Clear existing queues before seeding
  await prisma.queue.deleteMany({})
  console.log('🧹 Cleared existing queues')

  // Create sample queues - mix of waiting, in progress, and completed
  const queues = await Promise.all([
    // Waiting queues
    prisma.queue.create({
      data: {
        queueNumber: 'H001',
        serviceType: 'HELPDESK',
        status: 'WAITING',
        customerId: customers[0].id,
        serviceCategory: 'E_FILING',
        priorityLevel: 'NORMAL'
      }
    }),
    prisma.queue.create({
      data: {
        queueNumber: 'T001',
        serviceType: 'TPT',
        status: 'WAITING',
        customerId: customers[1].id,
        serviceCategory: 'SYSTEM_ACCESS',
        priorityLevel: 'HIGH'
      }
    }),
    prisma.queue.create({
      data: {
        queueNumber: 'T002',
        serviceType: 'TPT',
        status: 'WAITING',
        customerId: customers[2].id,
        serviceCategory: 'E_BILLING',
        priorityLevel: 'URGENT'
      }
    }),
    prisma.queue.create({
      data: {
        queueNumber: 'B001',
        serviceType: 'BOTH',
        status: 'WAITING',
        customerId: customers[3].id,
        serviceCategory: 'SPT_GUIDANCE',
        priorityLevel: 'NORMAL'
      }
    }),

    // In progress queue
    prisma.queue.create({
      data: {
        queueNumber: 'T003',
        serviceType: 'TPT',
        status: 'IN_PROGRESS',
        customerId: customers[4].id,
        serviceCategory: 'DOCUMENT_UPLOAD',
        priorityLevel: 'NORMAL',
        calledBy: tpt1.id,
        calledAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        startedAt: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
      }
    }),

    // Completed queues with ratings and feedback
    prisma.queue.create({
      data: {
        queueNumber: 'T004',
        serviceType: 'TPT',
        status: 'COMPLETED',
        customerId: customers[0].id,
        serviceCategory: 'E_FILING',
        priorityLevel: 'NORMAL',
        calledBy: tpt1.id,
        calledAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        serviceDuration: 30,
        notes: 'Membantu wajib pajak reset password e-Filing dan verifikasi data login',
        internalNotes: 'WP kesulitan dengan password yang sering lupa',
        rating: 5,
        feedback: 'Pelayanan sangat membantu dan sabar dalam menjelaskan'
      }
    }),
    prisma.queue.create({
      data: {
        queueNumber: 'T005',
        serviceType: 'TPT',
        status: 'COMPLETED',
        customerId: customers[1].id,
        serviceCategory: 'E_BILLING',
        priorityLevel: 'HIGH',
        calledBy: tpt2.id,
        calledAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
        serviceDuration: 25,
        notes: 'Membantu pembayaran PPN melalui e-Billing dengan panduan lengkap',
        internalNotes: 'WP baru pertama kali menggunakan sistem e-Billing',
        rating: 4,
        feedback: 'Penjelasan cukup jelas, namun perlu lebih banyak contoh'
      }
    }),
    prisma.queue.create({
      data: {
        queueNumber: 'T006',
        serviceType: 'TPT',
        status: 'COMPLETED',
        customerId: customers[2].id,
        serviceCategory: 'SPT_GUIDANCE',
        priorityLevel: 'NORMAL',
        calledBy: tpt1.id,
        calledAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        serviceDuration: 45,
        notes: 'Panduan pengisian SPT 1770 lengkap dengan pengecekan data',
        internalNotes: 'WP membutuhkan bantuan untuk melengkapi dokumen pendukung',
        rating: 5,
        feedback: 'Sangat puas dengan pelayanan, semua ditjelaskan dengan detail'
      }
    }),
    prisma.queue.create({
      data: {
        queueNumber: 'T007',
        serviceType: 'TPT',
        status: 'COMPLETED',
        customerId: customers[3].id,
        serviceCategory: 'SYSTEM_ACCESS',
        priorityLevel: 'URGENT',
        calledBy: tpt2.id,
        calledAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        completedAt: new Date(), // Today
        serviceDuration: 35,
        notes: 'Membantu aktivasi akun DJP Online dan verifikasi data',
        internalNotes: 'Kasus urgent - WP perlu segera mengakses sistem untuk deadline',
        rating: 3,
        feedback: 'Pelayanan cukup baik namun agak lama menunggu verifikasi sistem'
      }
    }),

    // Escalated case
    prisma.queue.create({
      data: {
        queueNumber: 'T008',
        serviceType: 'TPT',
        status: 'ESCALATED',
        customerId: customers[4].id,
        serviceCategory: 'PAYMENT_ISSUES',
        priorityLevel: 'URGENT',
        calledBy: tpt1.id,
        calledAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        escalatedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        escalatedTo: kepalaSeksi.id,
        escalatedReason: 'Masalah teknis kompleks dengan sistem pembayaran DJP'
      }
    }),

    // Another completed service for tpt1
    prisma.queue.create({
      data: {
        queueNumber: 'T009',
        serviceType: 'TPT',
        status: 'COMPLETED',
        customerId: customers[2].id,
        serviceCategory: 'E_FILING',
        priorityLevel: 'NORMAL',
        calledBy: tpt1.id,
        calledAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        completedAt: new Date(), // Today
        serviceDuration: 25,
        notes: 'Membantu pengisian SPT Tahunan melalui e-Filing',
        internalNotes: 'WP baru pertama kali menggunakan e-Filing',
        rating: 5,
        feedback: 'Pelayanan sangat membantu dan jelas penjelasannya'
      }
    })
  ])

  console.log('✅ Sample queues created')

  // Create announcements
  await prisma.announcement.createMany({
    data: [
      {
        title: 'Selamat Datang di Kantor Pelayanan Pajak',
        content: 'Kami siap melayani kebutuhan perpajakan Anda dengan sepenuh hati. Silakan ambil nomor antrian dan tunggu giliran Anda.',
        createdBy: admin.id
      },
      {
        title: 'Layanan e-Filing 24 Jam',
        content: 'Pelajari cara menggunakan e-Filing untuk melaporkan SPT Tahunan Anda secara online. Konsultasikan dengan petugas kami untuk bantuan.',
        createdBy: admin.id
      },
      {
        title: 'Program Pengampunan Pajak',
        content: 'Informasi tentang program pengampunan pajak tersedia. Hubungi helpdesk untuk detail lebih lanjut.',
        createdBy: admin.id
      },
      {
        title: 'Jadwal Operasional',
        content: 'Senin - Jumat: 08:00 - 16:00 WIB. Sabtu: 08:00 - 13:00 WIB. Minggu & Hari Libur: Tutup.',
        createdBy: admin.id
      }
    ]
  })

  console.log('✅ Announcements created')

  console.log('🎉 Database seeding completed successfully!')
  console.log('\n📊 Summary:')
  console.log(`   Users: ${await prisma.user.count()}`)
  console.log(`   Customers: ${await prisma.customer.count()}`)
  console.log(`   Service Templates: ${await prisma.serviceTemplate.count()}`)
  console.log(`   Queues: ${await prisma.queue.count()}`)
  console.log(`   Announcements: ${await prisma.announcement.count()}`)
  console.log('\n🔐 Test Accounts:')
  console.log('   Admin: admin / password123')
  console.log('   Receptionist: receptionist / password123')
  console.log('   Helpdesk: helpdesk / password123')
  console.log('   TPT: tpt1, tpt2 / password123')
  console.log('   Kepala Seksi: kepala_seksi / password123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })