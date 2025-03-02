import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Message, TextChannel, Guild, GuildMember, User, ChannelType } from 'discord.js';
import { commandsList } from '../src/features/commands'; 

const mockMessage = {
  content: '',
  channel: {
    type: ChannelType.GuildText,
    send: vi.fn(),
  },
  guild: {
    channels: {
      cache: {
        get: vi.fn(),
      },
    },
    roles: {
      everyone: {},
    },
  },
  author: {
    id: '123456789',
  },
  mentions: {
    users: {
      first: vi.fn().mockReturnValue({ id: '123456789' }),
    },
    members: new Map(),
  },
  reply: vi.fn(),
} as unknown as Message;

const mockTextChannel = {
  type: ChannelType.GuildText,
  send: vi.fn(),
  permissionOverwrites: {
    create: vi.fn(),
  },
  guild: {
    roles: {
      everyone: {},
    },
  },
} as unknown as TextChannel;

const fetchMsg = {
  delete: vi.fn(),
  edit: vi.fn(),
};

describe('Discord Bot Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMessage.channel.send = vi.fn().mockResolvedValue(fetchMsg);
    if (mockMessage.guild) {
        mockMessage.guild.channels.cache.get = vi.fn().mockReturnValue(mockTextChannel);
    }
    (mockMessage as { member: GuildMember }).member = {
      roles: {
        cache: new Map([
          ['staff', { name: 'staff' }],
        ]),
        some: vi.fn().mockReturnValue(true),
      },
    } as unknown as GuildMember;
  });

  it('should handle !move command', async () => {
    mockMessage.content = '!move #general @user1 @user2';
    await commandsList[14].handleMessage(mockMessage);
    expect(mockTextChannel.send).toHaveBeenCalled();
  });

  it('should handle !mdn command', async () => {
    mockMessage.content = '!mdn Array.prototype.map';
    await commandsList[15].handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });

  it('should handle !react-docs command', async () => {
    mockMessage.content = '!react-docs useState';
    await commandsList[16].handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });

  it('should handle !lock command', async () => {
    mockMessage.content = '!lock';
    await commandsList[30].handleMessage(mockMessage);
    expect(mockTextChannel.permissionOverwrites.create).toHaveBeenCalled();
  });

  it('should handle !unlock command', async () => {
    mockMessage.content = '!unlock';
    await commandsList[31].handleMessage(mockMessage);
    expect(mockTextChannel.permissionOverwrites.create).toHaveBeenCalled();
  });

  it('should handle !auth command', async () => {
    mockMessage.content = '!auth';
    await commandsList[39].handleMessage(mockMessage);
    expect(mockMessage.channel.send).toHaveBeenCalled();
  });
});