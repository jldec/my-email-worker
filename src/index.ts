import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'
import PostalMime from 'postal-mime'

export default {
  async email(message, env, ctx) {
    console.log(`Received email from ${message.from}`)

    // parse for attachments - see readme for additional options
    // https://github.com/postalsys/postal-mime/tree/master?tab=readme-ov-file#postalmimeparse
    const email = await PostalMime.parse(message.raw)
    email.attachments.forEach((a) => {
      if (a.mimeType === 'application/json') {
        const jsonString = new TextDecoder().decode(a.content)
        const jsonValue = JSON.parse(jsonString)
        console.log(`JSON attachment value:\n${JSON.stringify(jsonValue, null, 2)}`)
      }
    })

    // reply to sender
    // https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/
    const messageId = message.headers.get('Message-ID')
    if (messageId) {
      console.log(`Replying to sender with message id:${messageId}`)
      const msg = createMimeMessage()
      msg.setHeader('In-Reply-To', messageId)
      msg.setHeader('From', 'test-email-worker@jldec.fun')
      msg.setSender('test-email-worker@jldec.me')
      msg.setRecipient(message.from)
      msg.setSubject('test-email-worker auto reply')
      msg.addMessage({
        contentType: 'text/plain',
        data: `Thanks for your message!`
      })

      ctx.waitUntil(
        message.reply(new EmailMessage('test-email-worker@jldec.fun', message.from, msg.asRaw()))
      )
    }

    ctx.waitUntil(message.forward('jurgen@haydnlabs.com'))
  }
} satisfies ExportedHandler<Env>
