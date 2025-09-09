import Sitemap from "../../models/Sitemap.js";

export const getSitemap = async (req, res) => {
  try {
    const { filename } = req.params;
    const sitemap = await Sitemap.findOne({ fileName: filename });

    if (!sitemap) {
      return res.status(404).send("Sitemap not found");
    }

    res.set("Content-Type", "application/xml");
    return res.send(sitemap.xmlContent);
  } catch (err) {
    console.error("❌ Error fetching sitemap:", err);
    res.status(500).send("Server error");
  }
};
