import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'
import PostalMime from 'postal-mime'

const workerAddress = 'test-email-worker@jldec.fun'

export default {
  async email(message, env, ctx) {
    console.log(`Received email from ${message.from}`)

    // parse for attachments - see postal-mime for additional options
    // https://github.com/postalsys/postal-mime/tree/master?tab=readme-ov-file#postalmimeparse
    const email = await PostalMime.parse(message.raw)
    email.attachments.forEach((a) => {
      if (a.mimeType === 'application/json') {
        const jsonString = new TextDecoder().decode(a.content)
        const jsonValue = JSON.parse(jsonString)
        console.log(`JSON attachment value:\n${JSON.stringify(jsonValue, null, 2)}`)
      }
    })

    // reply to sender must include in-reply-to with message ID
    // https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/
    const messageId = message.headers.get('Message-ID')
    if (messageId) {
      console.log(`Replying to ${message.from} with message ID ${messageId}`)
      const msg = createMimeMessage()
      msg.setHeader('In-Reply-To', messageId)
      msg.setSender(workerAddress)
      msg.setRecipient(message.from)
      msg.setSubject('Auto-reply')
      msg.addMessage({
        contentType: 'text/plain',
        data: `Thanks for the message`
      })
      const replyMessage = new EmailMessage(workerAddress, message.from, msg.asRaw())
      ctx.waitUntil(message.reply(replyMessage))
    }

    ctx.waitUntil(message.forward('jurgen@haydnlabs.com'))
  }
} satisfies ExportedHandler<Env>
