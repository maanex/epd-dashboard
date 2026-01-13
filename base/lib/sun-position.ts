

export function getDayLength(dayOfYear: number, latitude = 49.5856074): number {
  dayOfYear = ((dayOfYear % 365) + 365) % 365; // Ensure dayOfYear is within 0-364
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);

  // Solar declination in radians
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 
                      0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 
                      0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const latRad = latitude * Math.PI / 180;
  const sunsetCorrection = -0.833 * Math.PI / 180; // Accounts for atmospheric refraction

  const cosHourAngle = (Math.sin(sunsetCorrection) - Math.sin(latRad) * Math.sin(declination)) / 
                       (Math.cos(latRad) * Math.cos(declination));

  if (cosHourAngle >= 1) return 0;   // Polar Night
  if (cosHourAngle <= -1) return 24; // Midnight Sun

  const hourAngle = Math.acos(cosHourAngle); // in radians

  // Convert radians to degrees, then to hours (15 degrees per hour)
  return (2 * (hourAngle * 180 / Math.PI)) / 15;
}
