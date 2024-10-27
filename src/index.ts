/**
 * Welcome to Cloudflare Workers!
 *
 * This is a template for an Email Worker: a worker that is triggered by an incoming email.
 * https://developers.cloudflare.com/email-routing/email-workers/
 *
 * - The wrangler development server is not enabled to run email workers locally.
 * - Run `pnpm ship` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `pnpm cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { EmailMessage } from 'cloudflare:email'
import { createMimeMessage } from 'mimetext'
import PostalMime from 'postal-mime'

export default {
  email: async (message, env, ctx) => {
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
    const messageId = message.headers.get('message-id')
    if (messageId) {
      console.log(`Replying to ${message.from} with message ID ${messageId}`)
      const msg = createMimeMessage()
      msg.setHeader('in-reply-to', messageId)
      msg.setSender(env.EMAIL_WORKER_ADDRESS)
      msg.setRecipient(message.from)
      msg.setSubject('Auto-reply')
      msg.addMessage({
        contentType: 'text/plain',
        data: `Thanks for the message`
      })
      const replyMessage = new EmailMessage(env.EMAIL_WORKER_ADDRESS, message.from, msg.asRaw())
      ctx.waitUntil(message.reply(replyMessage))
    }

    ctx.waitUntil(message.forward(env.EMAIL_FORWARD_ADDRESS))
  },

  // Send email in respose to a POST request
  // TODO: Add CSRF and other protections against abuse
  // https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/#example-worker
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 })
    }
    const msg = createMimeMessage()
    msg.setSender(env.EMAIL_WORKER_ADDRESS)
    msg.setRecipient(env.EMAIL_FORWARD_ADDRESS)
    msg.setSubject('Worker POST')
    msg.addMessage({
      contentType: 'text/plain',
      data: (await request.text()) ?? 'No body'
    })

    var message = new EmailMessage(env.EMAIL_WORKER_ADDRESS, env.EMAIL_FORWARD_ADDRESS, msg.asRaw())
    try {
      await env.SEND_EMAIL.send(message)
    } catch (e) {
      return new Response((e as Error).message)
    }

    return new Response('OK')
  }
} satisfies ExportedHandler<Env>
