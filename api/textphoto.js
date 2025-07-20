const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

const generateTextPhoto = async (url, texts) => {
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

    // Extract required form fields
    const server = $('#build_server').val();
    const serverId = $('#build_server_id').val();
    const token = $('#token').val();
    const submit = $('#submit').val();

    if (!server || !serverId || !token || !submit) {
      throw new Error('Failed to extract required form data from the page');
    }

    // Handle different form types (some have radio buttons)
    const formData = new FormData();
    formData.append('submit', submit);
    formData.append('token', token);
    formData.append('build_server', server);
    formData.append('build_server_id', Number(serverId));

    // Add radio button selection if present
    const radioOptions = [];
    $('input[name="radio0[radio]"]').each((i, elem) => {
      radioOptions.push($(elem).attr('value'));
    });

    if (radioOptions.length > 0) {
      formData.append('radio0[radio]', radioOptions[Math.floor(Math.random() * radioOptions.length)]);
    }

    // Add all text inputs
    texts.forEach(text => {
      formData.append('text[]', text);
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

    // Extract the form value for the final request
    const $formResponse = cheerio.load(formSubmitResponse.data);
    const formValue = $formResponse('#form_value').first().text() || 
                      $formResponse('#form_value_input').first().text() || 
                      $formResponse('#form_value').first().val() || 
                      $formResponse('#form_value_input').first().val();

    if (!formValue) {
      throw new Error('Failed to extract form value for image generation');
    }

    // Generate the final image
    const imageGenerationResponse = await axios.post(
      `${new URL(url).origin}/effect/create-image`,
      JSON.parse(formValue),
      {
        headers: {
          "Accept": "*/*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Origin": new URL(url).origin,
          "Referer": url,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188",
          "Cookie": initialResponse.headers['set-cookie']?.join('; ') || ""
        }
      }
    );

    // Construct the response
    const response = {
      status: "success",
      code: 200,
      message: "Text photo generated successfully",
      data: {
        image_url: server + (imageGenerationResponse.data?.fullsize_image || imageGenerationResponse.data?.image || ""),
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
