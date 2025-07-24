# Auto React Status WhatsApp 🤖📱

**(Built with JavaScript + Whiskeys.js)**

Bot whatsapp otomatis untuk memberi reaksi (reaction emoji) pada **status WhatsApp** menggunakan **Whiskeys.js**, alat powerful untuk mengotomatisasi WhatsApp Web dengan JavaScript.

## ✨ Fitur

* 🔄 Auto Read Chat — otomatis menandai pesan masuk sebagai terbaca
* 🚫 Anti Call — otomatis memblokir atau membalas saat ada panggilan masuk
* ❤️ Auto React Status — memberikan reaksi emoji pada status kontak

## 🧰 Instalasi

### 1. Clone Repo

```bash
git clone https://github.com/username/auto-react-status-wa.git
cd auto-react-status-wa
```

### 2. Install Dependensi

```bash
npm install
```

### 3. Jalankan Bot

```bash
node index.js
```

## ⚙️ Konfigurasi

Edit file `settings.js`:

```js
global.settings = {
    autoread: false,
    anticall: true,
    autoreact: true
}

global.emoji = [
    "🗿", 
    "🔥", 
    "👀",
    "😹"
]
```

* `autoread`: otomatis menandai pesan masuk sebagai terbaca
* `anticall`: mencegah panggilan WhatsApp dengan blok atau respon otomatis
* `autoreact`: aktifkan/deaktivasi fitur auto react status
* `emoji`: daftar emoji yang akan digunakan secara acak saat memberi reaksi

## 📦 Struktur Proyek

```
📁 auto-react-status-wa
├── index.js
├── settings.js
└── package.json
```

## 🤝 Kontribusi

Pull Request dan issue sangat diterima!
Fork repo ini dan bantu kembangkan fiturnya.

## 🙏 Kredit

Base project dan inspirasi dari: [@Kemii]([https://github.com/sansekai/whiskeys.js](https://github.com/HeyyKemii))
