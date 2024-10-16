export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
    if (message.from !== "jurgen@ciaosoft.com") {
      console.log(`Reject email from ${message.from}`)
      message.setReject(`Not allowed`);  
      return;
    }
    console.log(`Forward email from ${message.from}`)
    await message.forward("jurgen@jldec.me");
  }
}