// MIT https://github.com/postalsys/postal-mime/blob/master/LICENSE.txt
import PostalMime from 'postal-mime';

export default {
  async email(
    message: ForwardableEmailMessage,
    env: Env,
    ctx: ExecutionContext
  ) {
    if (message.from !== 'jurgen@ciaosoft.com') {
      console.log(`Reject email from ${message.from}`);
      message.setReject(`Not allowed`);
      return;
    }
    console.log(`Received email from ${message.from}`);

    // parse for attachments - see readme below for additional options
    // https://github.com/postalsys/postal-mime/tree/master?tab=readme-ov-file#postalmimeparse
    const email = await PostalMime.parse(message.raw);
    email.attachments.forEach((a) => {
      if (a.mimeType.startsWith('application/json')) {
        const jsonString = new TextDecoder().decode(a.content);
        const jsonValue = JSON.parse(jsonString);
        console.log(
          `JSON attachment value:\n${JSON.stringify(jsonValue, null, 2)}`
        );
      }
    });

    await message.forward('jurgen@haydnlabs.com');
  },
};
