'use strict'
// Remplit le gabarit du guide : {{VERSION}}, {{RELEASES_URL}}, {{FONT_DIR}}. Une balise sans valeur est une erreur.
function fillGuide(html, values) {
  return html.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) throw new Error(`Valeur manquante pour {{${key}}}`)
    return String(values[key])
  })
}

module.exports = { fillGuide }
