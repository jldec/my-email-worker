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

I created this starter repo [on GitHub](https://github.com/jldec/my-email-worker) which has logging enabled, and uses [postal-mime](https://github.com/postalsys/postal-mime#readme) to parse raw emails for attachments.

wrangler.toml
```toml
#:schema node_modules/wrangler/config-schema.json
name = "my-email-worker"
main = "src/index.ts"
compatibility_date = "2024-10-11"

[observability]
enabled = true
```

### Here are the persisted logs from the Cloudflare dashboard. 🎉

![cf-email-worker-persisted-logs](https://github.com/user-attachments/assets/8a92e303-25d9-49ef-b573-86787b000331)
