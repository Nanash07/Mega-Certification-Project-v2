# **Skenario Pengujian Blackbox \- MegaCertification**

1. # Authentication

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **AUTH-01** | Login Superadmin | Halaman Login | Input username & password | u:superadmin, p:5uperAdmin | Redirect ke Dashboard | Redirect berhasil | ✅ PASS |
| **AUTH-02** | Login PIC | Halaman Login | Input username & password | u:PIC, p:PIC | Redirect ke Dashboard | Redirect berhasil | ✅ PASS |
| **AUTH-03** | Login Gagal (Wrong Pass) | Halaman Login | Input password salah | u:superadmin, p:Test1234 | Muncul pesan error | Pesan error tampil | ✅ PASS |
| **AUTH-04** | Login Gagal (User Unknown) | Halaman Login | Input username tidak terdaftar | u:unknown, p:Test1234 | Muncul pesan error | Pesan error tampil | ✅ PASS |
| **AUTH-05** | Forgot Password | Halaman Login | Request reset password | nakulastudy@gmail.com | Notifikasi email terkirim | Notifikasi tampil | ✅ PASS |
| **AUTH-06** | Reset Password | Halaman Reset | Input password baru | newPassword123 | Redirect ke Login, pesan sukses | Redirect berhasil | ✅ PASS |

2. # Dashboard

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **DASH-01** | Load Dashboard | Login Sukses | Buka menu Dashboard | \- | Statistik dan chart tampil | Data tampil | ✅ PASS |
| **DASH-02** | Filter Regional | Dashboard Page | Pilih dropdown Regional | \- | Data statistik ter-update | Filter berfungsi | ✅ PASS |
| **DASH-03** | Filter Sertifikasi | Dashboard Page | Pilih dropdown Sertifikasi | \- | Data statistik ter-update | Filter berfungsi | ✅ PASS |
| **DASH-04** | Chart Bulanan | Dashboard Page | Cek visualisasi chart | \- | Grafik tampil sesuai data | Data tampil | ✅ PASS |
| **DASH-05** | List Prioritas | Dashboard Page | Klik tab Jatuh Tempo | \- | Tabel pegawai tampil | Data tampil | ✅ PASS |
| **DASH-06** | Pagination Prioritas | Dashboard Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

3. # Data Pegawai

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **EMP-01** | Load Data Pegawai | Login Sukses | Buka menu Data Pegawai | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **EMP-02** | Search Pegawai | Data Pegawai Page | Ketik keyword di search box | nama pegawai | Data sesuai keyword tampil | Data tampil | ✅ PASS |
| **EMP-03** | Filter Regional | Data Pegawai Page | Pilih dropdown Regional | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **EMP-04** | Filter Divisi | Data Pegawai Page | Pilih dropdown Divisi | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **EMP-05** | Filter Jabatan | Data Pegawai Page | Pilih dropdown Jabatan | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **EMP-06** | Filter Status | Data Pegawai Page | Pilih dropdown Status | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **EMP-07** | Clear Filter | Filter Terpasang | Klik tombol Clear Filter | \- | Semua filter reset ke default | Reset berhasil | ✅ PASS |
| **EMP-08** | Download Template | Data Pegawai Page | Klik Download Template | \- | File Excel berhasil diunduh | File terunduh | ✅ PASS |
| **EMP-09** | Import Pegawai | Data Pegawai Page | Upload file Excel | data.xlsx | Notifikasi sukses, data masuk | Import berhasil | ✅ PASS |
| **EMP-10** | View Detail | Data Pegawai Page | Klik baris pegawai | \- | Halaman detail tampil | Detail tampil | ✅ PASS |
| **EMP-11** | View History | Data Pegawai Page | Klik tombol Histori | \- | Halaman histori tampil | Histori tampil | ✅ PASS |
| **EMP-12** | Security: Fake Excel | Data Pegawai Page | Upload file fake .xlsx | fake\_data.xlsx | Sistem menolak file | File ditolak | ✅ PASS |
| **EMP-13** | Pagination Pegawai | Data Pegawai Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

4. # Detail Pegawai

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **DET-01** | Check Tabs | Halaman Detail | Klik semua tab | \- | Konten tab tampil saat diklik | Tab berfungsi | ✅ PASS |
| **DET-02** | Upload Sertifikat | Tab Sertifikasi | Upload file sertifikat | File PDF/Image | Notifikasi sukses, status berubah | Upload berhasil | ✅ PASS |
| **DET-03** | View/Edit Sertifikat | Tab Sertifikasi | Klik Lihat atau Edit | \- | Modal tampil | Modal tampil | ✅ PASS |

# 

5. # Histori Pegawai

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **HIST-01** | Load Histori | Login Sukses | Buka menu Histori Pegawai | \- | Tabel histori tampil | Data tampil | ✅ PASS |
| **HIST-02** | Filter Histori | Histori Page | Pilih dropdown Tipe Aksi | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |

# 

6. # Pegawai Resign

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **RES-01** | Load Data Resign | Login Sukses | Buka menu Pegawai Resign | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **RES-02** | Search Resign | Resign Page | Ketik keyword di search box | nama pegawai resign | Data sesuai keyword tampil | Data tampil | ✅ PASS |
| **RES-03** | Pagination Resign | Resign Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

7. # Data Eligibility

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **ELIG-01** | Load Eligibility | Login Sukses | Buka menu Data Eligibility | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **ELIG-02** | Filter Rule/Job | Eligibility Page | Pilih dropdown Rule/Jabatan | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **ELIG-03** | Export Eligibility | Eligibility Page | Klik tombol Export | \- | File Excel berhasil diunduh | File terunduh | ✅ PASS |
| **ELIG-04** | Pagination Eligibility | Eligibility Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

8. # Eligibility Manual

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **MAN-01** | Load Manual List | Login Sukses | Buka menu Eligibility Manual | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **MAN-02** | Create Exception | Manual Page | Tambah exception baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **MAN-03** | Pagination Manual | Manual Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

9. # Kepegawaian: Sertifikat Pegawai

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **CERT-01** | Load Sertifikat | Login Sukses | Buka menu Sertifikat Pegawai | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **CERT-02** | Filter Status | Sertifikat Page | Pilih dropdown Status | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **CERT-03** | View Detail | Sertifikat Page | Klik icon mata | \- | Modal detail tampil | Modal tampil | ✅ PASS |
| **CERT-04** | Export Sertifikat | Sertifikat Page | Klik tombol Export | \- | File Excel berhasil diunduh | File terunduh | ✅ PASS |
| **CERT-05** | Pagination Sertifikat | Sertifikat Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

10. # Batch

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **BATCH-01** | Load Batch List | Login Sukses | Buka menu Batch | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **BATCH-02** | Create Batch | Batch Page | Tambah batch baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **BATCH-03** | Filter Batch | Batch Page | Pilih dropdown Status/Type/Date | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **BATCH-04** | Export Batch | Batch Page | Klik tombol Export | \- | File Excel berhasil diunduh | File terunduh | ✅ PASS |
| **BATCH-05** | View Detail Batch | Batch Page | Klik tombol detail batch | \- | Halaman detail tampil | Detail tampil | ✅ PASS |
| **BATCH-06** | Filter Peserta | Detail Batch Page | Pilih dropdown Regional/Status | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **BATCH-07** | CRUD Peserta | Detail Batch Page | Add/Edit/Delete peserta | \- | Notifikasi sukses untuk tiap aksi | Aksi berhasil | ✅ PASS |
| **BATCH-08** | Export Peserta Batch | Detail Batch Page | Klik tombol Export Excel | \- | File Excel berhasil diunduh | File terunduh | ✅ PASS |
| **BATCH-09** | Pagination Batch | Batch Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

11. # Sertifikasi: Mapping Jabatan

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **MAP-01** | Load Mapping List | Login Sukses | Buka menu Mapping Jabatan | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **MAP-02** | Filter Jabatan | Mapping Page | Pilih dropdown Jabatan | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **MAP-03** | Filter Sertifikasi | Mapping Page | Pilih dropdown Sertifikasi | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **MAP-04** | Filter Level | Mapping Page | Pilih dropdown Level | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **MAP-05** | Filter Sub Bidang | Mapping Page | Pilih dropdown Sub Bidang | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **MAP-06** | Filter Status | Mapping Page | Pilih dropdown Status | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **MAP-07** | Clear Filter | Filter Terpasang | Klik tombol Clear Filter | \- | Semua filter reset ke default | Reset berhasil | ✅ PASS |
| **MAP-08** | Download Template | Mapping Page | Klik Download Template | \- | File Excel berhasil diunduh | File terunduh | ✅ PASS |
| **MAP-09** | Import Mapping | Mapping Page | Upload file Excel | mapping.xlsx | Notifikasi sukses, data masuk | Import berhasil | ✅ PASS |
| **MAP-10** | Edit Mapping | Mapping Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **MAP-11** | Toggle Status | Mapping Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **MAP-12** | Delete Mapping | Mapping Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **MAP-13** | View History | Mapping Page | Klik tombol Histori | \- | Halaman histori tampil | Histori tampil | ✅ PASS |
| **MAP-14** | Security: Fake Excel | Mapping Page | Upload file fake .xlsx | fake\_mapping.xlsx | Sistem menolak file | File ditolak | ✅ PASS |
| **MAP-15** | Pagination Mapping | Mapping Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

12. # Aturan Sertifikat

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **RULE-01** | Load Aturan List | Login Sukses | Buka menu Aturan Sertifikat | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **RULE-02** | Create Aturan | Aturan Page | Tambah aturan baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **RULE-03** | Filter Sertifikasi | Aturan Page | Pilih dropdown Sertifikasi | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **RULE-04** | Filter Level | Aturan Page | Pilih dropdown Level | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **RULE-05** | Filter Sub Bidang | Aturan Page | Pilih dropdown Sub Bidang | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **RULE-06** | Filter Status | Aturan Page | Pilih dropdown Status | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **RULE-07** | Clear Filter | Filter Terpasang | Klik tombol Clear Filter | \- | Semua filter reset ke default | Reset berhasil | ✅ PASS |
| **RULE-08** | Edit Aturan | Aturan Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **RULE-09** | Toggle Status | Aturan Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **RULE-10** | Delete Aturan | Aturan Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **RULE-11** | View History | Aturan Page | Klik tombol Histori | \- | Halaman histori tampil | Histori tampil | ✅ PASS |
| **RULE-12** | Pagination Aturan | Aturan Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

13. # Jenis Sertifikasi

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **JCERT-01** | Load Jenis List | Login Sukses | Buka menu Jenis Sertifikasi | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **JCERT-02** | Create Jenis | Jenis Page | Tambah jenis baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **JCERT-03** | Edit Jenis | Jenis Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **JCERT-04** | Delete Jenis | Jenis Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **JCERT-05** | Pagination Jenis | Jenis Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

14. # Jenjang Sertifikasi

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **LEVEL-01** | Load Jenjang List | Login Sukses | Buka menu Jenjang | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **LEVEL-02** | Create Jenjang | Jenjang Page | Tambah jenjang baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **LEVEL-03** | Edit Jenjang | Jenjang Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **LEVEL-04** | Delete Jenjang | Jenjang Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **LEVEL-05** | Pagination Jenjang | Jenjang Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

15. # Sub Bidang

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **SUB-01** | Load Sub Bidang List | Login Sukses | Buka menu Sub Bidang | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **SUB-02** | Create Sub Bidang | Sub Bidang Page | Tambah sub bidang baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **SUB-03** | Edit Sub Bidang | Sub Bidang Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **SUB-04** | Delete Sub Bidang | Sub Bidang Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **SUB-05** | Pagination Sub Bidang | Sub Bidang Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

16. # Lembaga Sertifikasi

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **INST-01** | Load Lembaga List | Login Sukses | Buka menu Lembaga | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **INST-02** | Create Lembaga | Lembaga Page | Tambah lembaga baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **INST-03** | Edit Lembaga | Lembaga Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **INST-04** | Delete Lembaga | Lembaga Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **INST-05** | Pagination Lembaga | Lembaga Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

17. # Regional

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **REG-01** | Load Regional List | Login Sukses | Buka menu Regional | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **REG-02** | Search Regional | Regional Page | Ketik keyword di search box | Keyword | Data sesuai keyword tampil | Data tampil | ✅ PASS |
| **REG-03** | Toggle Status | Regional Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **REG-04** | Pagination Regional | Regional Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

18. # Division

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **DIV-01** | Load Division List | Login Sukses | Buka menu Division | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **DIV-02** | Search Division | Division Page | Ketik keyword di search box | Keyword | Data sesuai keyword tampil | Data tampil | ✅ PASS |
| **DIV-03** | Toggle Status | Division Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **DIV-04** | Pagination Division | Division Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

19. # Unit

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **UNIT-01** | Load Unit List | Login Sukses | Buka menu Unit | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **UNIT-02** | Search Unit | Unit Page | Ketik keyword di search box | Keyword | Data sesuai keyword tampil | Data tampil | ✅ PASS |
| **UNIT-03** | Toggle Status | Unit Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **UNIT-04** | Pagination Unit | Unit Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

20. # Job Position

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **JOB-01** | Load Job Position List | Login Sukses | Buka menu Job Position | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **JOB-02** | Search Job Position | Job Position Page | Ketik keyword di search box | Keyword | Data sesuai keyword tampil | Data tampil | ✅ PASS |
| **JOB-03** | Toggle Status | Job Position Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **JOB-04** | Pagination Job Position | Job Position Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

21. # Kelola User

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **USER-01** | Load User List | Login Superadmin | Buka menu Kelola User | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **USER-02** | Create User | User Page | Tambah user baru | \- | Notifikasi sukses, data tampil | Simpan berhasil | ✅ PASS |
| **USER-03** | Create User Validation | User Page | Input password lemah | Pass: "123" | Muncul pesan error validasi | Validasi berfungsi | ✅ PASS |
| **USER-04** | Edit User | User Page | Klik tombol Edit | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **USER-05** | Toggle Status | User Page | Klik badge Status | \- | Status berubah sesuai pilihan | Toggle berhasil | ✅ PASS |
| **USER-06** | Delete User | User Page | Klik tombol Delete | \- | Konfirmasi muncul, data terhapus | Delete berhasil | ✅ PASS |
| **USER-07** | Filter User | User Page | Pilih dropdown Role & Status | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **USER-08** | Pagination User | User Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

22. # Kelola PIC Scope

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **SCOPE-01** | Load PIC Scope | Login Superadmin | Buka halaman PIC Scope | \- | Tabel data tampil dengan paginasi | Data tampil | ✅ PASS |
| **SCOPE-02** | Manage Scope | Scope Page | Kelola scope PIC | \- | Notifikasi sukses, scope tersimpan | Simpan berhasil | ✅ PASS |
| **SCOPE-03** | Verify Scope | Scope Page | Verifikasi perubahan scope | \- | Kolom sertifikasi ter-update | Data tampil | ✅ PASS |
| **SCOPE-04** | Pagination Scope | Scope Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

23. # Template & Jadwal

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **TPLT-01** | Load Templates | Login Admin | Buka menu Template & Jadwal | \- | Tabel data tampil dengan tab | Data tampil | ✅ PASS |
| **TPLT-02** | Edit Template | Template Page | Edit judul dan body template | \- | Notifikasi sukses, perubahan tersimpan | Update berhasil | ✅ PASS |
| **TPLT-03** | Variable Guide | Template Page | Cek panduan variabel | \- | List variabel tampil | Data tampil | ✅ PASS |
| **TPLT-04** | Update Jadwal | Template Page | Ubah jam dan toggle aktif | \- | Notifikasi sukses, jadwal tersimpan | Update berhasil | ✅ PASS |
| **TPLT-05** | Pagination Template | Template Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

24. # Konfigurasi Email

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **CFG-01** | Load Config | Login Admin | Buka Konfigurasi Email | \- | Form konfigurasi tampil | Data tampil | ✅ PASS |
| **CFG-02** | Save Config | Config Page | Simpan konfigurasi SMTP | \- | Notifikasi sukses, config tersimpan | Simpan berhasil | ✅ PASS |
| **CFG-03** | Password Masking | Config Page | Cek field password | \- | Password tersembunyi, toggle eye works | Masking berfungsi | ✅ PASS |

# 

25. # Test Koneksi Email

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **SMTP-01** | Test Email Success | Config Ready | Kirim email test | email@test.com | Notifikasi sukses, email terkirim | Email terkirim | ✅ PASS |
| **SMTP-02** | Test Email Fail | Config Empty | Kirim tanpa config | \- | Muncul pesan error validasi | Validasi berfungsi | ✅ PASS |

# 

26. # Notifikasi Terkirim (Superadmin & PIC)

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **LOG-01** | Load Sent Log | Login Admin | Buka Notifikasi Terkirim | \- | Tabel log tampil | Data tampil | ✅ PASS |
| **LOG-02** | Filter Log | Log Page | Pilih dropdown Status/Date | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **LOG-03** | View Detail Log | Log Page | Klik item log | \- | Modal detail tampil | Modal tampil | ✅ PASS |
| **LOG-04** | Pagination Log | Log Page | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

# 

27. # Notifikasi Saya (User)

| Test Case ID | Skenario | Precondition | Langkah Pengujian | Data Uji  | Expected Result | Actual Result | Status |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **INBOX-01** | Load Inbox | Login User | Buka menu Notifikasi | \- | List notifikasi tampil | Data tampil | ✅ PASS |
| **INBOX-02** | Mark as Read | User Inbox | Klik notifikasi belum dibaca | \- | Status berubah jadi sudah dibaca | Status berubah | ✅ PASS |
| **INBOX-03** | Filter Inbox | User Inbox | Pilih dropdown Tipe | \- | Tabel refresh sesuai filter | Filter berfungsi | ✅ PASS |
| **INBOX-04** | Pagination Inbox | User Inbox | Klik Next/Previous page | \- | Halaman tabel berubah | Pagination berfungsi | ✅ PASS |

