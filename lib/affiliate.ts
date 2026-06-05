const AFFILIATE_ID = "2001489215";

export function buildAffiliateUrl(goodsId: string): string {
  const params = new URLSearchParams({
    subj: "goods-detail",
    _bg_fs: "1",
    _p_mat2_type: "a4002",
    _p_jump_id: "1040",
    _x_vst_scene: "adg",
    adg_ctx: "a-dafec67f",
    goods_id: goodsId,
    _p_rfs: "1",
    _x_ads_channel: "kol_affiliate",
    _x_campaign: "affiliate",
    _x_cid: `${AFFILIATE_ID}kol_affiliate`,
    _x_ads_csite: "affiliate_goods_share",
    g_site: "100",
    g_lg: "en",
    g_region: "211",
    g_ccy: "USD",
  });
  return `https://www.temu.com/kuiper/uk1.html?${params.toString()}`;
}

export function extractGoodsId(url: string): string | null {
  const match = url.match(/goods_id=(\d+)/);
  return match ? match[1] : null;
}
