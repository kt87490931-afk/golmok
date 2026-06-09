import { getStoreStatus } from './sojanggong-api.js?v=20260629';
import { getCurrentUser } from './community.js?v=20260624';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function loadStoreStatus(upjongCode, regionCode) {
  const container = document.getElementById('store-status-wrap');
  if (!container) return;

  container.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">불러오는 중...</div>';

  const user = await getCurrentUser();
  if (!user) {
    container.innerHTML =
      '<div style="text-align:center;padding:20px;color:#999;">업소 현황은 로그인 후 확인할 수 있습니다.</div>';
    return;
  }

  if (!upjongCode) {
    container.innerHTML =
      '<div style="text-align:center;padding:20px;color:#999;">업종을 선택하면 소진공 업소 현황을 볼 수 있습니다.</div>';
    return;
  }

  try {
    const result = await getStoreStatus({
      regionCode: regionCode || '경기 화성시 동탄2동',
      upjongCode,
      pageIndex: 1,
      pageSize: 10,
    });

    if (!result?.data?.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">업소 데이터가 없습니다</div>';
      return;
    }

    container.innerHTML = `
      <div style="margin:24px 0 12px;">
        <div style="font-size:14px;font-weight:700;">
          📊 업소 현황
          <span style="font-size:12px;color:#999;font-weight:400;margin-left:6px;">총 ${result.totalCount ?? result.data.length}개 · 소상공인365</span>
        </div>
      </div>
      <div style="background:#fff;border-radius:12px;border:1px solid #E8E4DC;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#F7F3EB;">
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#555;">상호명</th>
              <th style="padding:10px 14px;text-align:left;font-weight:600;color:#555;">지역</th>
              <th style="padding:10px 14px;text-align:center;font-weight:600;color:#555;">개업일</th>
              <th style="padding:10px 14px;text-align:center;font-weight:600;color:#555;">상태</th>
            </tr>
          </thead>
          <tbody>
            ${result.data
              .map(
                (store) => `
              <tr style="border-top:1px solid #F5F1E8;">
                <td style="padding:10px 14px;font-weight:500;">${escapeHtml(store.storeName)}</td>
                <td style="padding:10px 14px;color:#555;">${escapeHtml(store.region)}</td>
                <td style="padding:10px 14px;text-align:center;color:#999;">${escapeHtml(store.openDate)}</td>
                <td style="padding:10px 14px;text-align:center;">
                  <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${store.status === '영업중' ? '#E8F8F0' : '#FFF1F1'};color:${store.status === '영업중' ? '#1D9E75' : '#E24B4A'};">
                    ${escapeHtml(store.status)}
                  </span>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    console.error('업소현황 오류:', err);
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">데이터를 불러올 수 없습니다</div>';
  }
}
