import { MessageOptions } from 'child_process'
import * as discord from 'discord.js'
import cron from 'node-cron'

export type MessageConfig = {
    cronExpression: string;
    guilds: {id: discord.Snowflake, channelIds: discord.Snowflake[]}[];
    message: discord.MessageOptions;
}

export const messages: MessageConfig[] = []

export const scheduleMessages = (bot: discord.Client, messageConfigs: MessageConfig[]) => {
    const scheduledTasks = messageConfigs.map(messageConfig => scheduleMessage(bot, messageConfig))
    return scheduledTasks
}

export const scheduleMessage = (bot: discord.Client, messageConfig: MessageConfig) => {
    return cron.schedule(messageConfig.cronExpression, () => sendMessage(bot, messageConfig))
}

const sendMessage = async (bot: discord.Client, messageConfig: MessageConfig) => {
    for (let {id, channelIds} of messageConfig.guilds) {
        const guild = await bot.guilds.fetch(id);
        
        for (let channelId of channelIds) {
            const channel = guild.channels.resolve(channelId)

            if (channel === null) {
                console.log(`Failed to send a scheduled message: channel ${channelId} does not exist in guild ${id}.`)
            } else if (!isTextChannel(channel)) {
                console.log(`Failed to send a scheduled message: channel ${channelId} in guild ${id} is not a text channel.`)
            } else {
                channel.send(messageConfig.message)
            }
        }
    }
}

const isTextChannel = (channel: discord.Channel): channel is discord.TextChannel | discord.DMChannel | discord.NewsChannel => {
    return channel.type === 'text' || channel.type === 'news' || channel.type === 'store'
}