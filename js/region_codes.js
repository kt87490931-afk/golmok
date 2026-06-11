/** 행정동·업종 키워드 → 소진공 API 코드 (확장 가능) */
export const REGION_CODES = {
  동탄: '4159025',
  동탄1동: '4159025100',
  동탄2동: '4159025300',
  동탄3동: '4159025600',
  수원: '4111000',
  인계동: '4111179',
  화성: '4159000',
  봉담: '4159025800',
  봉담읍: '4159025800',
  오산: '4137000',
  서울: '1100000',
  중구: '1114000',
  소공동: '1114052',
  명동: '1114065',
  강남: '1168000',
  역삼동: '1168053',
};

export const UPJONG_CODES = {
  음식: 'I2',
  치킨: 'I2',
  카페: 'I2',
  커피: 'I2',
  소매: 'G2',
  편의점: 'G2',
  교육: 'P1',
  수리: 'S2',
};

export function resolveRegionCode(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  if (/^\d{7,10}$/.test(trimmed)) return trimmed;
  if (REGION_CODES[trimmed]) return REGION_CODES[trimmed];
  const hit = Object.keys(REGION_CODES).find((k) => trimmed.includes(k));
  return hit ? REGION_CODES[hit] : null;
}

export function resolveUpjongCode(name) {
  if (!name) return 'I2';
  const trimmed = String(name).trim();
  if (UPJONG_CODES[trimmed]) return UPJONG_CODES[trimmed];
  const hit = Object.keys(UPJONG_CODES).find((k) => trimmed.includes(k));
  return hit ? UPJONG_CODES[hit] : 'I2';
}
