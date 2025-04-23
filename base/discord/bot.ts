import * as fs from 'fs/promises'
import * as path from 'path'
import { ButtonBuilder, ButtonStyle, ChannelType, Client, ComponentType, Events, GatewayIntentBits, TextChannel } from 'discord.js'
import consola from 'consola'
import { useImage } from '../lib/image'
import { drawQuote } from '../ui/quote'


export async function runDiscordBot() {
  const config = await fs.readFile(path.join(import.meta.dirname, '..', '..', 'credentials', 'discord.json'))
  const { token, id: selfId, channel } = JSON.parse(config.toString())

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

  client.on(Events.MessageCreate, async message => {
    if (message.author.bot)
      return
    if (message.channelId !== channel)
      return

    await message.react('🫦')

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

    let image: ArrayBuffer | undefined = undefined
    let text: string | undefined = undefined
    if (hasImage) {
      const attachment0 = message.attachments.values().next().value
      if (!attachment0)
        return

      const res = await fetch(attachment0.url)
      image = await res.arrayBuffer()
    } else {
      text = message.content
        .replace(/<@!?(\d+)>/g, (_, id) => {
          const user = message.guild?.members.cache.get(id)?.user
          return user ? `@${user.username}` : `<@${id}>`
        })
        .replace(/<#(\d+)>/g, (_, id) => {
          const channel = message.guild?.channels.cache.get(id) as TextChannel
          return channel ? `#${channel.name}` : `<#${id}>`
        })
    }

    const img = useImage(800 - 250, 480 - 160)
    await img.draw(
      drawQuote({
        author: message.author.displayName,
        text,
        image: message.attachments.values().next()?.value?.url,
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
      files: [
        {
          attachment: Buffer.from(file),
          name: fileName
        }
      ],
      flags: 32768,
      components: [
        {
          type: 12,
          items: [
            {
              media: {
                url: `attachment://${fileName}`,
              }
            }
          ]
        },
        {
          type: 10,
          content: `-# Vote below  —  submitted by <@${message.author.id}>`,
        }
      ]
    })
    await mes.react('👍')
    await mes.react('👎')

    await message.delete()
  })

  client.login(token)
}
