import React from 'react';

/**
 * Status pill for a value's quality. OPC UA delivers a `quality` string (e.g.
 * "Good"); MQTT has none, so it shows a neutral "n/a". Colour + text + dot mean
 * the state survives colourblindness and grayscale (not colour alone).
 *
 * @param {{ quality?: string }} props
 */
export default function QualityPill({ quality }) {
  if (!quality) return <span className="pill neutral">n/a</span>;
  const q = String(quality).toLowerCase();
  let tone = 'bad';
  if (q.includes('good')) tone = 'good';
  else if (q.includes('uncertain')) tone = 'warn';
  return (
    <span className={`pill ${tone}`} title={quality}>
      {quality}
    </span>
  );
}
