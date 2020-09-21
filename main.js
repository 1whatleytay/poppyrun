const fs = require('fs')

const Discord = require('discord.js')
const client = new Discord.Client()

const token = fs.readFileSync('token.txt', 'utf8')
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))

// temporary
const channelId = "651603697993777153"
let channel = null

let resolver = null

let variables = { }

async function say(text) {
    await channel.send(text)
}

async function input() {
    return new Promise(res => { resolver = res })
}

async function delay(time) {
    return new Promise(res => setTimeout(res, time))
}

async function eval(source) {
    switch (source.type) {
        case 'variable':
            return variables[source.content]
        case 'number':
            return source.content
        case 'string':
            return source.content
        case 'input':
            return await input()
        case 'is':
            return await eval(source.a) === await eval(source.b)
        case 'isnt':
            return await eval(source.a) === await eval(source.b)
        case 'or':
            return await eval(source.a) || await eval(source.b)
        case 'and':
            return await eval(source.a) && await eval(source.b)
        case '>':
            return await eval(source.a) > await eval(source.b)
        case '<':
            return await eval(source.a) < await eval(source.b)
        case '>=':
            return await eval(source.a) >= await eval(source.b)
        case '<=':
            return await eval(source.a) <= await eval(source.b)
        case '+':
            return await eval(source.a) + await eval(source.b)
        case '-':
            return await eval(source.a) - await eval(source.b)
        case 'concat': {
            let result = ''
            for (let a of source.content) {
                result += await eval(a)
            }
            return result
        }
        case 'random':
            return Math.floor(Math.random() * (await eval(source.content) + 1))
        default:
            console.error('Unhandled source.')
            break
    }
}

async function execute(exec) {
    do {
        for (let a = 0; a < exec.code.length; a++) {
            const code = exec.code[a]

            switch (code.type) {
                case 'say':
                    await say(await eval(code.source))
                    break
                case 'assign':
                    variables[code.destination] = await eval(code.source)
                    break
                case 'break':
                    return true
                case 'loop':
                    await execute(code)
                    break
                case 'if':
                    for (let branch of code.branches) {
                        if (branch.source && !await eval(branch.source)) {
                            continue
                        }

                        if (await execute(branch))
                            return exec.type !== 'loop'
                        break
                    }
                    break
                case 'delay':
                    await delay(await eval(code.source))
                    break
                default:
                    console.error('Unhandled code.')
                    break
            }
        }
    } while(exec.type === 'loop');
}

client.on('message', message => {
    if (message.channel.id === channelId && resolver) {
        resolver(message.content)
        resolver = null
    }
})

client.login(token)
    .then(() => {
        console.log('Bot started.')
        channel = client.channels.get(channelId)

        execute(app).then(() => {
            console.log('App finished executing.')
        })
    }).catch(() => { console.error('Failed to login.') })