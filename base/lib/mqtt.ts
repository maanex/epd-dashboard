import * as mqtt from "mqtt"
import { MqttClient } from "mqtt"


export const TopicStat = 'epddash/stat'
export const TopicUpFull = 'epddash/up/full'
export const TopicUpPart = 'epddash/up/part'

type Stat = 'hello' | 'bye' | 'require_full'
type Listener = (stat: Stat) => void

export const useMqtt = () => {
  let client: MqttClient | null = null

  const url = `http://${String(process.env.MQTT_HOST)}:1883`
  const listeners = new Set<Listener>()

  function init() {
    const { promise, resolve } = Promise.withResolvers<void>()
    client = mqtt.connect(url)
    client.on("connect", () => {
      client!.subscribe(TopicStat)
      resolve()
    })
    client.on('message', (topic, message) => {
      if (topic === TopicStat) {
        const stat = message.toString() as Stat
        listeners.forEach(listener => listener(stat))
      }
    })
    return promise
  }

  function subscribeStat(listener: Listener) {
    listeners.add(listener)
  }

  function sendBinary(topic: typeof TopicUpFull | typeof TopicUpPart, payload: Buffer) {
    client!.publish(topic, payload)
  }

  return {
    init,
    subscribeStat,
    sendBinary
  }
}
