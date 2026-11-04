# PlexDL: Multi-Network Bonding & Plexo Features Integration Blueprint

This document explains in clear, simple English how we can combine the core innovations of **Plexo** into **Awesome Downloader** (rebranding to **PlexDL**), detailing the exact working mechanics, step-by-step roadmap, and code architecture.

---

## 1. What is the Core Feature We Are Combining?

The flagship feature of Plexo is **Application-Layer Network Channel Bonding**:
* **The Problem Today:** Even if your PC is plugged into Gigabit Ethernet, connected to 5GHz Wi-Fi, and tethered to a 5G phone via USB simultaneously, Windows and macOS will only send download traffic through **one** default network adapter. The other connections sit completely idle.
* **The PlexDL Solution:** PlexDL forces your computer to open download connections across **all active internet adapters at the same time**. Part of the file downloads over Wi-Fi, part over Ethernet, and part over 5G phone tethering.
* **The Result:** Your total download speed equals **Connection A + Connection B + Connection C** combined.

---

## 2. How It Works (Simple English & Architecture)

```
                       [ Remote File: 1 GB ]
                                 │
     ┌───────────────────────────┼───────────────────────────┐
     ▼                           ▼                           ▼
 Chunk 1 (0-333MB)          Chunk 2 (333-666MB)        Chunk 3 (666-1000MB)
     │                           │                           │
     ▼ (Socket bound to)         ▼ (Socket bound to)         ▼ (Socket bound to)
 localAddress: 192.168.1.15  localAddress: 192.168.0.25  localAddress: 192.168.42.50
     │                           │                           │
  [ Wi-Fi Adapter ]           [ Ethernet Card ]         [ Phone USB Tethering ]
     │ (25 MB/s)                 │ (40 MB/s)                 │ (15 MB/s)
     └───────────────────────────┼───────────────────────────┘
                                 │
                                 ▼
                     Combined Speed: 80 MB/s
                                 │
                                 ▼
              [ Local Disk Assembly: Single Final File ]
```

### The Secret Mechanism: Node.js `localAddress`
In standard Node.js/Electron, when making an HTTP/HTTPS request, `http.request(url, options)` supports an option called `localAddress`:
```javascript
const req = https.request(url, {
  headers: { Range: `bytes=${start}-${end}` },
  localAddress: '192.168.42.50' // <--- Forces this chunk through the phone USB tether!
});
```
By telling each worker thread which local IP address to bind to, the operating system kernel is forced to route that specific socket connection out through that physical network adapter. No virtual VPN drivers, no router hardware, and no kernel modifications are required.

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Network Adapter Discovery (`core/network-manager.mjs`)
Create a new module that detects and monitors all available internet connections on the user's PC:

1. **Use `os.networkInterfaces()`** to scan all hardware adapters.
2. **Filter valid interfaces:** Ignore loopback (`127.0.0.1`), internal Docker/WSL bridges, and disconnected virtual adapters. Keep only valid IPv4 interfaces with active gateways (Wi-Fi, Ethernet, Mobile Tethering).
3. **Connectivity Verification:** Send a lightweight ping/HEAD request through each detected interface to verify it has actual outbound internet access.
4. **Adapter Descriptor Object:**
   ```javascript
   {
     id: 'wlan0',
     name: 'Wi-Fi (Intel Wi-Fi 6E)',
     ip: '192.168.1.15',
     type: 'wifi',
     enabled: true,
     metered: false,
     dailyLimitMb: 0,
     usedTodayMb: 0
   }
   ```

---

### Phase 2: Socket Binding in HTTP Transport (`core/http.mjs`)
Update the existing request function in `core/http.mjs` to accept `localAddress`:

1. Accept `localAddress` in `options`:
   ```javascript
   export async function request(url, { method = 'GET', headers = {}, localAddress = undefined, signal, redirects = 0 } = {}) {
     const req = (url.startsWith('https:') ? https : http).request(url, {
       method,
       headers,
       signal,
       localAddress // <--- Binds socket to specific network interface
     }, resolve);
     ...
   }
   ```
2. **Graceful Failover:** If an interface suddenly unplugs (e.g. user unplugs their phone USB cable), catch `ENETUNREACH` or `EADDRNOTAVAIL` and immediately reassign that pending chunk to another active adapter without cancelling the download.

---

### Phase 3: Dynamic Multi-Interface Workload Balancer (`core/engine.mjs`)
Enhance `awesome-downloader`'s segmented download engine:

1. **Proportional Chunk Sizing:**
   Instead of dividing files into equal-sized static chunks, dynamically measure each network's download speed. If Wi-Fi is twice as fast as Mobile Tethering, give Wi-Fi twice as many chunks or larger byte-ranges.
2. **"Slow Chunk Racing" (Plexo Feature):**
   If a connection is almost done, but one slow chunk is lingering on a slower adapter, spawn a duplicate request for the remaining bytes on the fastest idle adapter. Whichever finishes first gets written to disk, and the other is cancelled. This prevents downloads from stalling at 99%.

---

### Phase 4: Metered Mobile Data Protection
Since users often combine metered cellular phone plans, add safety controls:

1. **Data Budget Limiter:** Users can set a limit like *"Use mobile data up to 1 GB per day"*.
2. **Automatic Cutoff:** Once the mobile adapter reaches its quota, the engine stops assigning new chunks to it and gracefully finishes the download on unlimited Wi-Fi/Ethernet.

---

### Phase 5: UI & Telemetry Integration (`renderer/`)

1. **Header Multi-Network Pill:**
   Replace the single throughput chip with a multi-network breakdown:
   ```
   [ ● Wi-Fi: 18 MB/s | ● 5G Tether: 12 MB/s | Total: 30 MB/s ]
   ```
2. **Options Dialog -> "Network Bonding" Tab:**
   * List detected adapters with toggle checkboxes:
     - `[x] Wi-Fi (192.168.1.15)`
     - `[x] USB Cellular (192.168.42.50)`
     - `[ ] Ethernet (Disconnected)`
   * Per-network speed limiters and monthly/daily data caps.
3. **Activity Matrix Grid Multi-Color Highlighting:**
   In the 25x4 Activity Matrix, blocks can display which adapter downloaded each segment (e.g. Emerald Green for Wi-Fi, Electric Cyan for Phone USB), making the multi-threaded parallel engine visually clear.

---

### Phase 6: BitTorrent & Magnet Link Support (Future Extension)
Plexo also includes a BitTorrent client. Once multi-network HTTP is running:
1. Integrate `webtorrent` or a lightweight torrent client.
2. Bind peer connections across multiple network adapters using the same `localAddress` strategy.

---

## 4. How to Push This Codebase to Your New GitHub Repo

Run the following commands in PowerShell from the project root:

```powershell
# 1. Switch working directory to awesome-downloader
cd "d:\Type Script Project\Download Manger\awesome-downloader"

# 2. Add all recent improvements (UI refinements, vertical fill animation, non-resizable popups, sidebar cleanup)
git add -A

# 3. Commit your changes
git commit -m "feat: complete download manager UI redesign, vertical matrix fill, and PlexDL preparation"

# 4. Set your new GitHub repository as origin
git remote set-url origin https://github.com/manish-sherawat/PlexDL.git

# 5. Push to your main branch
git push -u origin main
```

*(If your new repo on GitHub has an initial commit, you can use `git push -u origin main --force` to push your complete codebase clean.)*

