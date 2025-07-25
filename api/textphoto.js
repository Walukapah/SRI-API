const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");

const formatError = (error) => {
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
};

const validateUrl = (url) => {
  if (!url) throw new Error("URL parameter is required");
  if (!/https?:\/\/(ephoto360|photooxy|textpro)\.(com|me)/i.test(url)) {
    throw new Error("Invalid URL - Only ephoto360, photooxy, and textpro websites are supported");
  }
  return true;
};

const extractTexts = (queryParams) => {
  const texts = [];
  for (const key in queryParams) {
    if (key.startsWith('text')) {
      texts.push(queryParams[key]);
    }
  }
  if (texts.length === 0) throw new Error("At least one text parameter is required");
  return texts;
};

const fetchInitialData = async (url) => {
  const response = await axios.get(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Origin": (new URL(url)).origin,
      "Referer": url,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188"
    }
  });
  return response;
};

const buildFormData = ($, texts) => {
  const server = $('#build_server').val();
  const serverId = $('#build_server_id').val();
  const token = $('#token').val();
  const submit = $('#submit').val();

  const types = [];
  $('input[name="radio0[radio]"]').each((i, elem) => {
    types.push($(elem).attr("value"));
  });

  const postData = {
    'submit': submit,
    'token': token,
    'build_server': server,
    'build_server_id': Number(serverId)
  };

  if (types.length !== 0) {
    postData['radio0[radio]'] = types[Math.floor(Math.random() * types.length)];
  }

  const form = new FormData();
  for (const key in postData) {
    form.append(key, postData[key]);
  }
  
  texts.forEach(text => form.append("text[]", text));

  return { form, server };
};

const submitForm = async (url, form, cookies) => {
  const response = await axios.post(url, form, {
    headers: {
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Origin": (new URL(url)).origin,
      "Referer": url,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188", 
      "Cookie": cookies?.join("; ") || "",
      ...form.getHeaders()
    }
  });
  return response;
};

const createImage = async (originUrl, formValue, cookies) => {
  const response = await axios.post(
    (new URL(originUrl)).origin + "/effect/create-image", 
    JSON.parse(formValue),
    {
      headers: {
        "Accept": "*/*",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": (new URL(originUrl)).origin,
        "Referer": originUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.188",
        "Cookie": cookies?.join("; ") || ""
      }
    }
  );
  return response.data;
};

module.exports = async (url, queryParams) => {
  try {
    // Validate input
    validateUrl(url);
    const texts = extractTexts(queryParams);

    // Initial request to get form data
    const initialResponse = await fetchInitialData(url);
    const $ = cheerio.load(initialResponse.data);

    // Build form data
    const { form, server } = buildFormData($, texts);

    // Submit form
    const formResponse = await submitForm(url, form, initialResponse.headers['set-cookie']);
    const $form = cheerio.load(formResponse.data);
    const formValue = ($form('#form_value').first().text() || 
                      $form('#form_value_input').first().text() || 
                      $form('#form_value').first().val() || 
                      $form('#form_value_input').first().val());

    if (!formValue) throw new Error("Failed to get form value for image creation");

    // Create final image
    const result = await createImage(url, formValue, initialResponse.headers['set-cookie']);

    // Format successful response
    return {
      status: "success",
      code: 200,
      message: "Image generated successfully",
      data: {
        image_info: {
          original_url: url,
          texts_used: texts,
          image_url: server + (result?.fullsize_image || result?.image || ""),
          session_id: result?.session_id || ""
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        creator: "WALUKA🇱🇰",
        service: "TextPhotoGenerator"
      }
    };

  } catch (error) {
    return formatError(error);
  }
};
