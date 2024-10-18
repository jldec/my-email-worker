# Routing emails through a Cloudflare Worker
https://jldec.me/blog/routing-emails-through-a-cloudflare-worker

This is a quick walkthrough of how to setup email routing on your domain and process emails with a Cloudflare Worker.

If all you want to do is forward emails, you can do this without a worker, but workers are a nice way to handle more complex routing logic or process emails in other ways.

The steps below assume that you have a domain name and are using Cloudflare to manage [DNS](https://www.cloudflare.com/learning/dns/dns-records/). They also assume that the domain is not already configured for another email provider.

## Enable email routing on your domain

- Go to `Websites` in your Cloudflare [dashboard](https://dash.cloudflare.com/zones) and select the domain for which you're enabling email (I'm using `jldec.fun`).
- Look for `Email > Email Routing` and click the `Get started` button.
- Provide a new address for receiving, and a forwarding address.
- After verifying the forwarding address, confirm the DNS changes.
- Once the DNS changes are done, your first routing rules will take effect.

## Create an email Worker

- Go to the `Email Workers` tab, and cick the `Create` button.`
- Choose the `Allowlist senders` starter.
- In the online editor, fix the code to suit your needs, then `Save and Deploy`.
- Create a custom email address for the worker to receive emails.
- Send a test email to the new worker email address.
- You should see the `Live` worker logs in the worker dashboard under `Workers & Pages`. (Start the log stream before sending the email.)

## 3. Deploy the Worker with Wrangler

[wrangler](https://developers.cloudflare.com/workers/wrangler/) will allow you to configure the worker with persisted logs, and can run builds with Typescript and 3rd-party npm packages.

To make this easier, I created a starter project at [github.com/jldec/my-email-worker](https://github.com/jldec/my-email-worker) with logging enabled.

The sample uses [postal-mime](https://github.com/postalsys/postal-mime#readme) to parse attachments, and [mime-text](https://github.com/muratgozel/MIMEText) to generate a reply. The `mime-text` package requires `nodejs_compat` in wrangler.toml.

To download the starter, run `pnpm create cloudflare --template github:jldec/my-email-worker`.

### wrangler.toml
```toml
#:schema node_modules/wrangler/config-schema.json
name = "my-email-worker"
main = "src/index.ts"
compatibility_date = "2024-10-11"
compatibility_flags = [ "nodejs_compat" ]

[observability]
enabled = true

[vars]
EMAIL_WORKER_ADDRESS = "my-email-worker@jldec.fun"
EMAIL_FORWARD_ADDRESS = "jurgen@jldec.me"
```

### src/index.ts
```ts
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
  }
} satisfies ExportedHandler<Env>
```
