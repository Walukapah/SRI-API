const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

const generateTextPhoto = async (url, texts) => {
  // URL validation with clear error messages
  try {
    // First validate it's a proper URL
    const parsedUrl = new URL(url);
    
    // Allowed domains configuration
    const allowedDomains = [
      { name: "ePhoto360", regex: /(^|\.)ephoto360\.(com|me)(\.|$)/i },
      { name: "PhotoOxy", regex: /(^|\.)photooxy\.(com|me)(\.|$)/i },
      { name: "TextPro", regex: /(^|\.)textpro\.(com|me)(\.|$)/i }
    ];

    // Check if domain is allowed
    const domainMatch = allowedDomains.find(d => d.regex.test(parsedUrl.hostname));
    if (!domainMatch) {
      const allowedList = allowedDomains.map(d => `- ${d.name} (${d.regex.toString()})`).join('\n');
      throw new Error(
        `Invalid URL - Only these services are supported:\n${allowedList}\n\n` +
        `You provided: ${parsedUrl.hostname}`
      );
    }

    // Initial request to get form data
    const initialResponse = await axios.get(url, {
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Origin": parsedUrl.origin,
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188"
      },
      timeout: 10000 // 10 seconds timeout
    });

    const $ = cheerio.load(initialResponse.data);

    // Extract required form fields with better error handling
    const getFieldValue = (selectors) => {
      for (const selector of selectors) {
        const val = $(selector).val();
        if (val) return val;
      }
      return null;
    };

    const server = getFieldValue(['#build_server', 'input[name="build_server"]']);
    const serverId = getFieldValue(['#build_server_id', 'input[name="build_server_id"]']);
    const token = getFieldValue(['#token', 'input[name="token"]']);
    const submit = getFieldValue(['#submit', 'button[name="submit"]']);

    if (!server || !serverId || !token || !submit) {
      throw new Error('Failed to extract required form data from the page. The website structure may have changed.');
    }

    const formData = new FormData();
    formData.append('submit', submit);
    formData.append('token', token);
    formData.append('build_server', server);
    formData.append('build_server_id', Number(serverId));

    // Handle radio buttons if present
    $('input[type="radio"][name^="radio"]').each((i, elem) => {
      const name = $(elem).attr('name');
      if (name && name.includes('[radio]')) {
        formData.append(name, $(elem).attr('value'));
      }
    });

    // Add all text inputs
    texts.forEach((text, index) => {
      formData.append(`text[${index}]`, text);
    });

    // Submit the form with timeout
    const formSubmitResponse = await axios.post(url, formData, {
      headers: {
        ...formData.getHeaders(),
        "Accept": "text/html",
        "Origin": parsedUrl.origin,
        "Referer": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188",
        "Cookie": initialResponse.headers['set-cookie']?.join('; ') || ""
      },
      timeout: 15000 // 15 seconds timeout
    });

    // Extract form value with multiple fallback methods
    const $formResponse = cheerio.load(formSubmitResponse.data);
    let formValue = getFieldValue(['#form_value', '#form_value_input', 'input[name="form_value"]']);

    if (!formValue) {
      const scriptContent = $formResponse('script').toString();
      const formValueMatch = scriptContent.match(/form_value\s*:\s*({[^}]+})/);
      if (formValueMatch) formValue = formValueMatch[1];
    }

    if (!formValue) {
      throw new Error('Failed to extract image generation parameters. The website may have updated its structure.');
    }

    // Clean and parse the form value
    try {
      const cleanedValue = formValue
        .replace(/'/g, '"')
        .replace(/(\w+)\s*:/g, '"$1":')
        .replace(/,\s*}/g, '}');
      
      const formJson = JSON.parse(cleanedValue);

      // Generate the final image with timeout
      const imageUrl = `${parsedUrl.origin}/effect/create-image`;
      const imageResponse = await axios.post(imageUrl, formJson, {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Origin": parsedUrl.origin,
          "Referer": url,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188",
          "Cookie": initialResponse.headers['set-cookie']?.join('; ') || ""
        },
        timeout: 20000 // 20 seconds timeout
      });

      // Validate and format response
      if (!imageResponse.data || (!imageResponse.data.image && !imageResponse.data.fullsize_image)) {
        throw new Error('The service did not return a valid image URL');
      }

      return {
        status: "success",
        code: 200,
        message: "Text photo generated successfully",
        data: {
          image_url: imageResponse.data.image 
            ? `${server}${imageResponse.data.image}`
            : imageResponse.data.fullsize_image,
          session_id: imageResponse.data.session_id,
          service: domainMatch.name,
          texts_used: texts
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: "2.1",
          creator: "WALUKA🇱🇰"
        }
      };

    } catch (parseError) {
      throw new Error(`Failed to process image generation: ${parseError.message}`);
    }

  } catch (error) {
    console.error('Text Photo Generation Error:', error);
    
    return {
      status: "error",
      code: error.response?.status || 500,
      message: error.message.includes('Invalid URL') 
        ? error.message 
        : `Failed to generate image: ${error.message}`,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        version: "2.1",
        attempted_url: url
      }
    };
  }
};

module.exports = generateTextPhoto;
