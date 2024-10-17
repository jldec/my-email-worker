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

    ctx.waitUntil(message.forward('jurgen@haydnlabs.com'))
  }
} satisfies ExportedHandler<Env>
