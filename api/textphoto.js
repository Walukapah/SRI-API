const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

const generateTextPhoto = async (url, texts) => {
  // Fixed URL validation - was rejecting valid URLs due to incorrect logic
  if (!/https?:\/\/(ephoto360|photooxy|textpro)\.(com|me)/i.test(url)) {
    throw new Error('Invalid URL - Only TextPro, ePhoto360, and PhotoOxy URLs are supported');
  }

  try {
    // Initial request to get form data
    const initialResponse = await axios.get(url, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Origin": new URL(url).origin,
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188"
      }
    });

    const $ = cheerio.load(initialResponse.data);

    // Extract required form fields - some ePhoto360 pages use different selectors
    const server = $('#build_server').val() || $('input[name="build_server"]').val();
    const serverId = $('#build_server_id').val() || $('input[name="build_server_id"]').val();
    const token = $('#token').val() || $('input[name="token"]').val();
    const submit = $('#submit').val() || $('button[name="submit"]').val();

    if (!server || !serverId || !token || !submit) {
      throw new Error('Failed to extract required form data from the page');
    }

    const formData = new FormData();
    formData.append('submit', submit);
    formData.append('token', token);
    formData.append('build_server', server);
    formData.append('build_server_id', Number(serverId));

    // Add radio button selection if present (common in ePhoto360)
    const radioOptions = [];
    $('input[name^="radio"]').each((i, elem) => {
      if ($(elem).attr('name').match(/radio\d+\[radio\]/)) {
        radioOptions.push($(elem).attr('value'));
      }
    });

    if (radioOptions.length > 0) {
      formData.append(radioOptions[0].match(/radio\d+/)[0] + '[radio]', 
                     radioOptions[Math.floor(Math.random() * radioOptions.length)]);
    }

    // Add all text inputs
    texts.forEach((text, index) => {
      formData.append(`text[${index}]`, text); // ePhoto360 uses text[0], text[1] format
    });

    // Submit the form
    const formSubmitResponse = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Origin": new URL(url).origin,
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188",
        "Cookie": initialResponse.headers['set-cookie']?.join('; ') || ""
      }
    });

    // Extract the form value - ePhoto360 sometimes uses different selectors
    const $formResponse = cheerio.load(formSubmitResponse.data);
    let formValue = $formResponse('#form_value').val() || 
                   $formResponse('#form_value_input').val() ||
                   $formResponse('input[name="form_value"]').val();

    if (!formValue) {
      // Try to find a script tag containing the form value
      const scripts = $formResponse('script').toString();
      const formValueMatch = scripts.match(/form_value[^}]*}/);
      if (formValueMatch) {
        formValue = formValueMatch[0].replace(/form_value\s*:\s*/, '');
      }
    }

    if (!formValue) {
      throw new Error('Failed to extract form value for image generation');
    }

    // Clean the form value if needed
    if (formValue.startsWith('{') && formValue.endsWith('}')) {
      formValue = formValue.replace(/\\'/g, "'");
    } else {
      formValue = formValue.replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
    }

    // Generate the final image
    const imageUrl = new URL(url).origin + '/effect/create-image';
    const imageGenerationResponse = await axios.post(imageUrl, JSON.parse(formValue), {
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": new URL(url).origin,
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188",
        "Cookie": initialResponse.headers['set-cookie']?.join('; ') || ""
      }
    });

    // Construct the response
    const response = {
      status: "success",
      code: 200,
      message: "Text photo generated successfully",
      data: {
        image_url: imageGenerationResponse.data?.image ? 
                 (server + imageGenerationResponse.data.image) : 
                 (imageGenerationResponse.data?.fullsize_image || ""),
        session_id: imageGenerationResponse.data?.session_id,
        service: new URL(url).hostname,
        texts_used: texts
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰"
      }
    };

    return response;

  } catch (error) {
    console.error('Text Photo Generation Error:', error);
    return {
      status: "error",
      code: 500,
      message: error.message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0"
      }
    };
  }
};

module.exports = generateTextPhoto;
