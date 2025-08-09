const { default: makeWASocket, jidDecode, Browsers, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const readline = require("readline")
const pino = require("pino")
const fs = require("fs")
const path = require("path")
const axios = require("axios")
const { GoogleGenerativeAI } = require("@google/generative-ai")
require('./settings')

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "MASUKAN API GEMINI LU!!!")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            resolve(answer.trim())
            rl.close()
        })
    })
}

const deleteSessionFiles = () => {
    const sessionPath = path.join(__dirname, 'sessions')
    if (fs.existsSync(sessionPath)) {
        try {
            fs.rmSync(sessionPath, { recursive: true, force: true })
            console.log('Session files deleted successfully.')
        } catch (err) {
            console.error(`Failed to delete session files: ${err.message}`)
        }
    }
}

// Run session cleanup every 24 hours
setInterval(deleteSessionFiles, 24 * 60 * 60 * 1000)

async function System() {
    const { state, saveCreds } = await useMultiFileAuthState('sessions')
    const sock = makeWASocket({ 
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        browser: ["Mac OS", "Safari", "10.15.7"],
    })

    if (!sock.authState.creds.registered) {
        process.stdout.write('\x1b[2J\x1b[0f')
        const phoneNumber = await question("Masukan nomer whatsapp kamu (62): ")
        let code = await sock.requestPairingCode(phoneNumber.trim())
        code = code.match(/.{1,4}/g)?.join("-") || code
        console.log("Pairing code: ", code)
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'connecting') {
            console.log('Koneksi pending')
        } else if (connection === 'close') {
            console.log('Koneksi terputus')
            System()
        } else if (connection === 'open') {
            process.stdout.write('\x1b[2J\x1b[0f')
            console.log('Koneksi tersambung')
            console.log('- Name: ', sock.user.name ? sock.user.name : "Kemii")
        }
    })

    sock.ev.on('messages.upsert', async (update) => {
        const msg = update.messages[0]
        const maxTime = 5 * 60 * 1000

        sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                const decode = jidDecode(jid) || {}
                return (
                    (decode.user && decode.server && decode.user + "@" + decode.server) || jid
                )
            } else return jid
        }

        if (global.autoTyping) {
            const command = msg.message?.conversation || msg.message?.extendedTextMessage?.text
            if (command) { sock.sendPresenceUpdate('composing', msg.key.remoteJid) }
        }

        // Handle AI commands
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text
        if (text) {
            if (text.startsWith('.ai ')) {
                const query = text.slice(4).trim()
                if (!query) {
                    await sock.sendMessage(msg.key.remoteJid, { text: "Silakan masukkan pertanyaan setelah .ai, contoh: .ai Apa itu AI?" })
                    return
                }
                try {
                    const result = await model.generateContent(query)
                    const response = await result.response
                    const answer = response.text()
                    await sock.sendMessage(msg.key.remoteJid, { text: answer })
                } catch (error) {
                    console.error("Error calling Gemini API:", error)
                    await sock.sendMessage(msg.key.remoteJid, { text: "Maaf, terjadi kesalahan saat memproses pertanyaan Anda." })
                }
            }
        }

        if (global.settings.autoreact && msg.key.remoteJid === 'status@broadcast') {
            if (msg.key.fromMe) return
            const currentTime = Date.now()
            const messageTime = msg.messageTimestamp * 1000
            const timeDiff = currentTime - messageTime

            if (timeDiff <= maxTime) {
                if (msg.pushName && msg.pushName.trim() !== "") {
                    await sock.readMessages([msg.key])
                    const timestamp = Date.now()
                    const dateObject = new Date(timestamp)
                    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
                    const dayName = days[dateObject.getDay()]
                    const date = dateObject.getDate()
                    const month = dateObject.getMonth() + 1
                    const year = dateObject.getFullYear()
                    const key = msg.key
                    const status = msg.key.remoteJid
                    const me = await sock.decodeJid(sock.user.id)
                    const emoji = global.emoji[Math.floor(Math.random() * global.emoji.length)]
                    await sock.sendMessage(status, { react: { key: key, text: emoji } }, { statusJidList: [key.participant, me] }).catch(() => {})
                    process.stdout.write('\x1b[2J\x1b[0f')
                    console.log("Reaction Story")
                    console.log(`- Name: `, msg.pushName)
                    console.log(`- Date: `, `${dayName}, ${date}/${month}/${year}`)
                    console.log(`- React: `, emoji)
                } 
            }
        } else if (global.settings.autoread && msg.key.remoteJid !== 'status@broadcast') {
            if (msg.key.fromMe) return
            await sock.readMessages([msg.key])
            const timestamp = Date.now()
            const dateObject = new Date(timestamp)
            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
            const dayName = days[dateObject.getDay()]
            const date = dateObject.getDate()
            const month = dateObject.getMonth() + 1
            const year = dateObject.getFullYear()
            process.stdout.write('\x1b[2J\x1b[0f')
            console.log("Reading Message")
            console.log("- Name: ", msg.pushName ? msg.pushName : "Unknown")
            console.log(`- Date: `, `${dayName}, ${date}/${month}/${year}`)
            console.log("- Pesan: ", msg.message.extendedTextMessage?.text || null)
        }
    })

    const callSpamTracker = {}

    sock.ev.on('call', async (update) => {
        for (const call of update) {
            const jid = call.chatId

            if (global.settings.anticall && call.status === 'offer') {
                if (!callSpamTracker[jid]) {
                    callSpamTracker[jid] = 1
                } else {
                    callSpamTracker[jid]++
                }

                await sock.rejectCall(call.id, call.from)
                await sock.sendMessage(jid, { text: `⚠️ Jangan melakukan panggilan! (${callSpamTracker[jid]}/5)` })
                console.log(`Panggilan dari ${jid} ke-${callSpamTracker[jid]} ditolak.`)

                if (callSpamTracker[jid] >= 5) {
                    await sock.sendMessage(jid, { text: `Kamu telah diblokir karena melakukan spam panggilan.` })
                    await sock.updateBlockStatus(jid, 'block')
                    console.log(`🔒 ${jid} telah diblokir karena spam call.`)
                    delete callSpamTracker[jid]

                    setTimeout(async () => {
                        await sock.updateBlockStatus(jid, 'unblock')
                        console.log(`🔓 ${jid} telah di-unblock setelah 24 jam.`)
                    }, 24 * 60 * 60 * 1000)
                }
            }
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

System()
