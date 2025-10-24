import * as fs from 'fs/promises'
import * as path from 'path'
import { BaseGuildTextChannel, ChannelType, Client, Events, GatewayIntentBits, TextChannel, type GuildTextBasedChannel, type GuildTextChannelResolvable, type TextThreadChannel } from 'discord.js'
import { schedule } from 'node-cron'
import consola from 'consola'
import { useImage } from '../lib/image'
import { drawQuote } from '../ui/quote'
import axios from 'axios'


const loadingEmojis = [ '🫦', '😍', '👀', '📸', '👍', '🤨', '👽', '🆗', '❔', '🤡' ]
const threadNames = [
  'Thing of the day',
  'Thing of the day',
  'Thing of the day',
  'Thing of the day',
  'Thing of the day',
  'Thing of the day',
  'Today\'s thing',
  'Today\'s quote',
  'You know what to do',
  'Thread',
  'Quote',
  'Quote of the day',
  'Ding des Tages',
  'Picture for the screen',
  'Picture for the screen today',
  'Picture for the screen today, please',
  'Picture for the screen today, please, thanks',
  'Picture for the screen today, please, thanks, love you',
  'Picture for the screen today, please, thanks, love you, bye',
  'Thing',
  'Let\'s go',
  'ARE YOU READY?',
  'Pizza burger pasta schnitzel',
  'Today\'s thing, please',
  'Today\'s thing, please, thanks',
  'HELLO WORLD',
  'SEND ME YOUR THINGS',
  'SEND ME YOUR PICTURES',
  'CAT PICTURE ONLY DAY',
  '!!!!!!!!!'
]

async function downloadImage(url: string | undefined, filename: string) {
  if (!url)
    return null
  const buff = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,de;q=0'
    },
  }).catch(e => null)
  if (!buff?.data)
    return null
  fs.writeFile(path.join(import.meta.dirname, '..', '..', 'credentials', 'cache', filename), buff.data)
}

export async function runDiscordBot() {
  const config = await fs.readFile(path.join(import.meta.dirname, '..', '..', 'credentials', 'discord.json'))
  const database = await fs.readFile(path.join(import.meta.dirname, '..', '..', 'credentials', 'datacord.json'))
  const { token, id: selfId, channel, archive } = JSON.parse(config.toString())
  const db: { candidates: any[], userWins: Record<string, number> } = JSON.parse(database.toString() || '{}')

  const saveDb = () => fs.writeFile(path.join(import.meta.dirname, '..', '..', 'credentials', 'datacord.json'), JSON.stringify(db))

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  })

  client.on(Events.ClientReady, readyClient => {
    consola.success(`Discord bot logged in as ${readyClient.user.tag}`)
  })

  client.on(Events.MessageCreate, message => Promise.try(async () => {
    if (message.author.bot)
      return
    if (message.channelId !== channel)
      return

    await message.react(loadingEmojis[Math.floor(Math.random() * loadingEmojis.length)])

    if (!message.deletable)
      return message.reply('Ey, delete this')

    if (message.channel.type !== ChannelType.GuildText)
      return

    const hooks = await message.channel.fetchWebhooks()
    let useHook = hooks.find(h => h.owner?.id === selfId)
    if (!useHook) {
      useHook = await message.channel.createWebhook({
        name: message.client.user.username,
        avatar: message.client.user.displayAvatarURL(),
      })
    }

    const hasImage = message.attachments.size > 0
    const hasText = message.content.length > 0
    if (!hasImage && !hasText)
      return

    const image = message.attachments.values().next()?.value
    if (hasImage && !image?.contentType?.startsWith('image/')) {
      message.delete().catch(console.error)
      return
    }

    let text: string | undefined = undefined
    if (!hasImage) {
      text = message.content
        .replace(/<@!?(\d+)>/g, (_, id) => {
          const user = message.guild?.members.cache.get(id)?.user
          return user ? `@${user.username}` : `<@${id}>`
        })
        .replace(/<#(\d+)>/g, (_, id) => {
          const channel = message.guild?.channels.cache.get(id) as TextChannel
          return channel ? `#${channel.name}` : `<#${id}>`
        })
    } else {
      downloadImage(image?.proxyURL ?? image?.url, `${message.id}.png`)
    }

    const img = useImage(800 - 400, 480 - 160)
    await img.draw(
      drawQuote({
        author: message.author.displayName,
        text,
        image: image?.url,
      }),
      0, 0,
      img.width, img.height
    )

    const buffer = await img.exportFullBw()
    const file = new Uint8Array(buffer)
    const fileName = `quote-${Date.now()}.png`

    const mes = await useHook.send({
      username: message.author.username,
      avatarURL: message.author.displayAvatarURL(),
      files: [ { attachment: Buffer.from(file), name: fileName } ],
      flags: 32768,
      components: [
        {
          type: 12, items: [
            { media: { url: `attachment://${fileName}`, } }
          ]
        },
        { type: 10, content: `-# Vote below  —  submitted by <@${message.author.id}>`, }
      ]
    })
    await mes.react('👍')
    await mes.react('👎')

    await message.delete()
    db.candidates ||= []
    db.candidates.push({
      id: mes.id,
      author: message.author.username,
      authorId: message.author.id,
      text: hasImage ? undefined : text,
      image: hasImage ? `${message.id}.png` : undefined,
    })
    saveDb()
  }).catch(console.error))

  const badaboom = async () => {
    const channelBro = await client.channels.fetch(channel) as BaseGuildTextChannel
    if (!channelBro)
      return consola.error(`Channel with ID ${channel} not found`)

    const messageList = await channelBro.messages.fetch({ limit: 100 })
    db.userWins ||= {}
    const maxUserWins = Math.max(...Object.values(db.userWins))
    const candidates = (db.candidates || [])
      .map((c: any) => ({
        ...c,
        score: (messageList.get(c.id)?.reactions.cache.get('👍')?.count || 0) - (messageList.get(c.id)?.reactions.cache.get('👎')?.count || 0)
          + (1 - (db.userWins[c.authorId] ?? 0) / (maxUserWins + 1))
          + (Math.random() * 0.3),
      }))
      .sort((a: any, b: any) => b.score - a.score)

    const winner = candidates[0]
    await channelBro.bulkDelete(db.candidates.length + 10)

    if (!winner) {
      await channelBro.send({
        flags: 32768,
        components: [
          { type: 10, content: `## TOTD ${new Date().toLocaleDateString(Math.random() < 0.5 ? 'en-US' : 'en-GB', { day: 'numeric', month: 'long' })}`, },
          { type: 10, content: `Nothing!\n\nThank you for your attention. Inner peace.`, },
          { type: 1, components: [ { type: 2, style: 2, label: 'What is this?', custom_id: 'whatsthis' } ] }
        ]
      })
      fs.unlink(path.join(import.meta.dirname, '..', '..', 'credentials', 'totd.json')).catch(console.error)
      return
    }

    db.userWins[winner.authorId] = (db.userWins[winner.authorId] || 0) + 1
    db.candidates = []
    saveDb()

    if (winner.image) {
      // rename file to current.png
      const cacheDir = path.join(import.meta.dirname, '..', '..', 'credentials', 'cache')
      const oldPath = path.join(cacheDir, winner.image)
      const newPath = path.join(cacheDir, 'current.png')
      await fs.rename(oldPath, newPath).catch(console.error)
      winner.image = 'current.png'
    }

    fs.writeFile(path.join(import.meta.dirname, '..', '..', 'credentials', 'totd.json'), JSON.stringify(winner)).catch(console.error)

    const img = useImage(800 - 400, 480 - 160)
    await img.draw(
      drawQuote(winner),
      0, 0,
      img.width, img.height
    )

    const buffer = await img.exportFullBw()
    const file = new Uint8Array(buffer)
    const fileName = `winner-${Date.now()}.png`

    await channelBro.send({
      flags: 32768,
      files: [
        { attachment: Buffer.from(file), name: fileName }
      ],
      components: [
        { type: 10, content: `## TOTD ${new Date().toLocaleDateString(Math.random() < 0.5 ? 'en-US' : 'en-GB', { day: 'numeric', month: 'long' })}`, },
        {
          type: 12, items: [
            { media: { url: `attachment://${fileName}`, } }
          ]
        },
        { type: 10, content: `-# Submitted by <@${winner.authorId}>\n\nSubmissions for tomorrow's thing of the day are open now!!! Post ahead!!!`, },
        { type: 1, components: [ { type: 2, style: 2, label: 'What is this?', custom_id: 'whatsthis' } ] }
      ]
    })

    const archiveBro = await client.channels.fetch(archive) as BaseGuildTextChannel
    if (archiveBro) {
      await archiveBro.send({
        flags: 32768,
        files: [
          { attachment: Buffer.from(file), name: fileName }
        ],
        components: [
          { type: 10, content: `${new Date().toISOString().split('T')[0]} by ${winner.author}`, },
          {
            type: 12, items: [
              { media: { url: `attachment://${fileName}`, } }
            ]
          },
        ]
      })
    }

    // clear cache folder, delete all files
    const cacheDir = path.join(import.meta.dirname, '..', '..', 'credentials', 'cache')
    const files = await fs.readdir(cacheDir)
    for (const file of files) {
      if (!file.startsWith('current'))
        fs.unlink(path.join(cacheDir, file)).catch(console.error)
    }
  }

  client.on(Events.MessageReactionAdd, (reaction, user) => {
    if (!reaction.message.author || reaction.message.author.bot)
      return
    if (reaction.message.channelId !== channel)
      return

    if (reaction.emoji.name === '👎' && reaction.message.author.id === user.id)
      reaction.message.delete().catch(console.error)
  })

  client.on(Events.InteractionCreate, int => Promise.try(async () => {
    if (int.isRepliable()) {
      int.reply({
        content: 'Thank you for your interest!\n\nI (<@1072591753854586900>) have this dashboard thing in my room, see https://discord.com/channels/1338149752671572039/1338153124270968923/1391773929776873605. On this image there\'s a silly cat on the right. Do you see it? Now here\'s the fun part: it\'s no longer the cat. Well. Unless you want it to. You can upload anything and everything into this channel to suggest it. Can be any image or just text as well! Then in the night the thing with the most upvotes gets picked as the image for the next day. So post your things and upvote cool things! And I will have to endure them the whole day. All day your image or text will sit next to me on my desk...',
        flags: 'Ephemeral'
      })
    }
  }).catch(console.error))

  client.once(Events.ClientReady, () => schedule('30 3 * * *', badaboom))

  client.login(token)
  return { badaboom }
}
