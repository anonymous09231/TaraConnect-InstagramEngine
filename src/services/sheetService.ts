const SHEET_URL = "https://script.google.com/macros/s/AKfycbzhVUDIo0QKfxKJeuwjrv42Lg1inVvZuTLG6ZMHNL-UBfPCRIuyDFAZayBXs4Y9mUCK0Q/exec";

export interface SheetData {
  username: string;
  followers: number;
  url: string;
}

export async function fetchSheetData(): Promise<SheetData[]> {
  try {
    const response = await fetch(SHEET_URL, {
      method: 'GET',
      redirect: 'follow',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const rawData = await response.json();
    console.log("Raw Sheet Data:", rawData);
    
    // Handle if the data is wrapped in an object (e.g., { data: [...] })
    const data = Array.isArray(rawData) ? rawData : (rawData.data || rawData.rows || []);
    
    if (!Array.isArray(data)) {
      throw new Error("Invalid data format received from the sheet. Expected an array.");
    }

    return data.map((item: any) => {
      // Try to find URL and Followers in various possible column names
      const url = item["Social Media URL"] || item.url || item.Url || item.URL || item.link || item.Link || item.Instagram || "";
      const username = item.username || item.Username || item.handle || item.Handle || "";
      const followersRaw = String(item.Followers || item.followers || item.Count || item.count || "0").toLowerCase().trim();
      
      let followers = 0;
      if (followersRaw.includes('k')) {
        followers = parseFloat(followersRaw.replace('k', '')) * 1000;
      } else if (followersRaw.includes('m')) {
        followers = parseFloat(followersRaw.replace('m', '')) * 1000000;
      } else {
        followers = parseInt(followersRaw.replace(/[^0-9.]/g, ""), 10) || 0;
      }
      
      return {
        username: String(username).trim(),
        url: String(url).trim(),
        followers: Math.floor(followers),
      };
    }).filter((item: SheetData) => item.username || item.url);
  } catch (error) {
    console.error("Sheet fetch error:", error);
    throw error;
  }
}
