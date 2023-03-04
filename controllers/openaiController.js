const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

const textGenerator = async (req, res) => {
  // input prompt coming from client
  const userPrompt = req.body.input;
  const editedPrompt = `Create a story title based on: ${userPrompt}`;
  try {
    // Title
    const response = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: editedPrompt,
      temperature: 0.5,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      best_of: 1,
    });

    const aiOutput = response.data.choices[0].text.replace(/\n+|"+/g, '');;
    

    // Image Generation
    const imagePrompt = `Generate a photorealistic image based on this story title and don't include words: ${aiOutput}`;

    const image = await openai.createImage({
      prompt: imagePrompt,
      n: 1,
      size: '512x512',
      // response_format: 'b64_json',
    });

    const imageUrl = image.data.data[0].url;
    // const finalImg = image.data.data[0].b64_json;
    // const finalImg = image.data.data[0].url;

    // Entry Paragraph
    const description = `Write a entry paragraph for a story based on this title: ${aiOutput}`;

    const entry = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: description,
      temperature: 0.5,
      max_tokens: 256,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      best_of: 1,
    });

    const entryOutput = entry.data.choices[0].text.trim();

    // trying body paragraph
    const storyBody = `Continue this entry paragraph with a long dialogue based story but dont finish the story: ${entryOutput}`;

    const story = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: storyBody,
      temperature: 0.8,
      max_tokens: 2500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      best_of: 1,
    });

    const storyBodyOutput = story.data.choices[0].text.trim();

    // trying the ending paragraph

    const storyEnding = `Write an ending paragraph for this story: ${storyBodyOutput}`;

    const storyEnd = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: storyEnding,
      temperature: 0.8,
      max_tokens: 3500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      best_of: 1,
    });

    const storyEndOutput = storyEnd.data.choices[0].text.trim();

    // Final data to be sent to client
    const finalData = {
      aiOutput,
      imageUrl,
      // finalImg,
      entryOutput,
      storyBodyOutput,
      storyEndOutput,
    };

    res.status(200).json({
      success: true,
      data: finalData,
    });
  } catch (error) {
    if (error.response) {
      console.log(error.response.status);
      console.log(error.response.data);
    } else {
      console.log(error.message);
    }

    res.status(400).json({
      success: false,
      error: 'Prompt cannot be generated',
    });
  }
};

module.exports = { textGenerator };
