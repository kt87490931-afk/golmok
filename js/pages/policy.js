import { getInfoPosts } from '../community.js?v=20260622';
import { renderPostList } from '../community_ui.js';
import { initPageShell, bootPage } from '../page_common.js';

async function loadPolicyPosts() {
  try {
    const posts = await getInfoPosts(20);
    await renderPostList(posts, 'policy-post-list', { reset: true });
  } catch (e) {
    console.error(e);
    const list = document.getElementById('policy-post-list');
    if (list) list.innerHTML = '<div style="padding:24px;text-align:center;color:#E24B4A;background:#fff;">寃뚯떆湲??遺덈윭?ㅼ? 紐삵뻽?듬땲??</div>';
  }
}

bootPage(async () => {
  initPageShell('policy');
  await loadPolicyPosts();
  window.addEventListener('golmok:posts-changed', () => loadPolicyPosts());
});
