{
  "name": "ALTUM · Propiedad → TikTok",
  "active": false,
  "settings": {
    "executionOrder": "v1",
    "timezone": "America/Guatemala",
    "errorWorkflow": "XIDPNIgqLCIOpaEr"
  },
  "pinData": {},
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "altum-propiedad-tiktok",
        "responseMode": "lastNode",
        "options": {}
      },
      "id": "b1a1e001-0001-4a01-9a01-tiktok0001web",
      "name": "Recibe solicitud (UI)",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2.1,
      "position": [0, 0],
      "webhookId": "7a1f2c3d-4b5e-4c6a-8d9e-0f1a2b3c4d5e"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://xbiltqfxyedlqadofclt.supabase.co/rest/v1/rpc/get_tiktok_generation_context",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "supabaseApi",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ p_property_id: ($json.body && $json.body.property_id) ? $json.body.property_id : $json.property_id }) }}",
        "options": {}
      },
      "id": "b1a1e002-0002-4a02-9a02-tiktok0002ctx",
      "name": "Contexto (Supabase)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [260, 0],
      "credentials": {
        "supabaseApi": { "id": "IZWkHbFOy7iwsu3x", "name": "Supabase account" }
      }
    },
    {
      "parameters": {
        "jsCode": "// Arma el prompt de TikTok, adaptado por objetivo + formato.\n// NADA hardcodeado: telefono/CTA vienen de app_config (config centralizada).\nconst ctx = $json || {};\nconst body = ($('Recibe solicitud (UI)').first().json.body) || $('Recibe solicitud (UI)').first().json || {};\n\nconst property_id = body.property_id || (ctx.property && ctx.property.id) || '';\nconst objective = String(body.objective || 'venta').toLowerCase();\nconst format = String(body.format || 'property_tour').toLowerCase();\n\nconst p = ctx.property || {};\nconst images = Array.isArray(ctx.images) ? ctx.images : [];\nconst config = ctx.config || {};\n\nconst wa = config.whatsapp_number || '';\nconst brand = config.brand_name || 'ALTUM Group';\nconst ctaDefault = config.cta_default || 'Escribenos por WhatsApp para mas informacion';\n\nconst imgCount = images.length;\nconst imgList = images.map((im, i) => '[' + i + '] ' + (im.url || '')).join('\\n');\n\nconst FORMAT = {\n  property_tour: 'Recorrido atractivo de la propiedad: muestra los mejores espacios y beneficios reales.',\n  opportunity: 'Enfoque de oportunidad: precio, plusvalia y urgencia honesta (sin exagerar ni inventar).',\n  educational: 'Ensena algo util (tip de compra, financiamiento, como elegir zona) usando la propiedad como ejemplo. Aporta valor real, no solo vende.',\n  storytelling: 'Narrativa emocional: cuenta una pequena historia con la que la audiencia conecte.',\n  investment: 'Enfoque inversionista: retorno, plusvalia y potencial de renta con numeros creibles; nunca prometas rentabilidad inventada.',\n  comparison: 'Comparacion clara y honesta (zona vs zona, o esta propiedad vs lo tipico del mercado).',\n  lifestyle: 'Aspiracional y de estilo de vida: como se siente vivir aqui, el entorno y la experiencia.'\n};\nconst OBJ = {\n  venta: 'Objetivo: venta.',\n  inversion: 'Objetivo: atraer inversionistas.',\n  renta: 'Objetivo: renta / alquiler.',\n  branding: 'Objetivo: marca y crecimiento de audiencia; prioriza alcance y valor de contenido, la venta es secundaria.'\n};\n\nconst datos = [\n  'Titulo: ' + (p.title || ''),\n  'Operacion: ' + (p.operation || ''),\n  'Tipo: ' + (p.type || ''),\n  'Zona: ' + (p.zone || '') + ' / ' + (p.city || 'Guatemala'),\n  'Precio: ' + ((p.price !== undefined && p.price !== null && p.price !== '') ? ((p.currency || 'GTQ') + ' ' + p.price) : 'No especificado'),\n  'Habitaciones: ' + (p.bedrooms ?? ''),\n  'Banos: ' + (p.bathrooms ?? ''),\n  'Parqueos: ' + (p.parking ?? ''),\n  'Area: ' + ((p.area_m2 !== undefined && p.area_m2 !== null && p.area_m2 !== '') ? (p.area_m2 + ' m2') : ''),\n  'Amenidades: ' + (Array.isArray(p.features) ? p.features.join(', ') : (p.features || '')),\n  'Referencia ubicacion: ' + (p.location_reference || ''),\n  'Descripcion actual: ' + (p.description || '')\n].join('\\n');\n\nconst L = [];\nL.push('Actua como estratega de contenido y guionista de video corto vertical (TikTok/Reels) para ' + brand + ', inmobiliaria premium en Guatemala.');\nL.push('');\nL.push('Genera un paquete de contenido para UN video vertical 9:16 de 20 a 35 segundos.');\nL.push('Formato solicitado: ' + format + '. ' + (FORMAT[format] || FORMAT.property_tour));\nL.push(OBJ[objective] || OBJ.venta);\nL.push('');\nL.push('Reglas: no inventes datos ni cifras; tono premium, natural y con gancho para redes; el hook debe durar 1 a 3 segundos y frenar el scroll; guion hablado de 20 a 35 s; sin promesas de rentabilidad sin sustento; CTA orientado a generar leads por WhatsApp usando el numero ' + (wa || '(configurar en app_config.tiktok_config)') + ' (base de CTA: \"' + ctaDefault + '\"). Si el formato es branding o educational, prioriza valor y retencion antes que venta directa.');\nL.push('');\nL.push('Datos de la propiedad:');\nL.push(datos);\nL.push('');\nL.push('Fotos disponibles (indice y URL) para el storyboard tipo slideshow / ken burns (V1 usa SOLO fotos, aun no hay video):');\nL.push(imgCount > 0 ? imgList : '(sin fotos: propon un storyboard generico por indices 0..n y marca datos_faltantes)');\nL.push('');\nL.push('Devuelve SOLO JSON valido, sin markdown, con EXACTAMENTE esta estructura:');\nL.push('{');\nL.push('  \"hook\": \"texto de 1-3 segundos\",');\nL.push('  \"script\": \"guion hablado completo 20-35s\",');\nL.push('  \"voiceover\": \"texto exacto para locucion (puede igualar script)\",');\nL.push('  \"caption\": \"caption para TikTok\",');\nL.push('  \"cta\": \"llamado a la accion orientado a lead por WhatsApp\",');\nL.push('  \"hashtags\": [\"#...\"],');\nL.push('  \"storyboard\": [{\"orden\":1,\"tipo\":\"foto\",\"media_index\":0,\"media_url\":\"\",\"duracion_s\":3,\"movimiento\":\"ken_burns_in\",\"nota\":\"que se ve / que se dice\"}],');\nL.push('  \"on_screen_text\": [{\"texto\":\"\",\"en_segundo\":0}],');\nL.push('  \"render_spec\": {\"aspect_ratio\":\"9:16\",\"fps\":30,\"total_duration_s\":30,\"audio\":{\"voiceover\":true,\"music_mood\":\"\"},\"scenes\":[{\"index\":0,\"media_index\":0,\"media_url\":\"\",\"start_s\":0,\"end_s\":3,\"motion\":\"ken_burns_in\",\"transition\":\"fade\",\"text_overlays\":[{\"texto\":\"\",\"start_s\":0,\"end_s\":3,\"position\":\"center\"}]}]},');\nL.push('  \"datos_faltantes\": []');\nL.push('}');\n\nreturn [{ json: { property_id: property_id, objective: objective, format: format, prompt: L.join('\\n') } }];"
      },
      "id": "b1a1e003-0003-4a03-9a03-tiktok0003prm",
      "name": "Preparar Prompt TikTok",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [520, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.openai.com/v1/chat/completions",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "openAiApi",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ model: \"gpt-4.1-mini\", temperature: 0.8, response_format: { type: \"json_object\" }, messages: [ { role: \"system\", content: \"Eres estratega de contenido y guionista de video corto vertical para ALTUM Group (inmobiliaria premium en Guatemala). Respondes SIEMPRE en JSON valido.\" }, { role: \"user\", content: $json.prompt } ] }) }}",
        "options": {}
      },
      "id": "b1a1e004-0004-4a04-9a04-tiktok0004oai",
      "name": "OpenAI - Generar TikTok",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [780, 0],
      "credentials": {
        "openAiApi": { "id": "BnFckRJHucl5ngTa", "name": "OpenAI account" }
      }
    },
    {
      "parameters": {
        "jsCode": "const meta = $('Preparar Prompt TikTok').first().json;\nlet content = '';\ntry { content = $json.choices[0].message.content || ''; } catch (e) { content = ''; }\nlet parsed;\ntry { parsed = JSON.parse(content); } catch (e) { parsed = { datos_faltantes: ['La IA no devolvio JSON valido'], raw: content }; }\nparsed.model = 'gpt-4.1-mini';\nreturn [{ json: { property_id: meta.property_id, objective: meta.objective, format: meta.format, contenido: parsed } }];"
      },
      "id": "b1a1e005-0005-4a05-9a05-tiktok0005prs",
      "name": "Parsear Respuesta",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [1040, 0]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://xbiltqfxyedlqadofclt.supabase.co/rest/v1/rpc/save_property_tiktok_content",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "supabaseApi",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ p_property_id: $json.property_id, p_objective: $json.objective, p_format: $json.format, p_content: $json.contenido }) }}",
        "options": {}
      },
      "id": "b1a1e006-0006-4a06-9a06-tiktok0006sav",
      "name": "Guardar (Supabase)",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1300, 0],
      "credentials": {
        "supabaseApi": { "id": "IZWkHbFOy7iwsu3x", "name": "Supabase account" }
      }
    }
  ],
  "connections": {
    "Recibe solicitud (UI)": { "main": [[{ "node": "Contexto (Supabase)", "type": "main", "index": 0 }]] },
    "Contexto (Supabase)": { "main": [[{ "node": "Preparar Prompt TikTok", "type": "main", "index": 0 }]] },
    "Preparar Prompt TikTok": { "main": [[{ "node": "OpenAI - Generar TikTok", "type": "main", "index": 0 }]] },
    "OpenAI - Generar TikTok": { "main": [[{ "node": "Parsear Respuesta", "type": "main", "index": 0 }]] },
    "Parsear Respuesta": { "main": [[{ "node": "Guardar (Supabase)", "type": "main", "index": 0 }]] }
  }
}
