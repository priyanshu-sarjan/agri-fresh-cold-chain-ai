# 🌱 AgriFresh Cold-Chain Logistics Engine
### Autonomous Dispatch & Dynamic Spoilage-Aware Rerouting

An end-to-end, full-stack logistics prototype engineered specifically for **perishable fresh-produce distribution**, where logistics isn't merely about shortest distance, but about **cold-chain integrity, spoilage mitigation, and strict shelf-life compliance**.

The UI design is crafted with a modern **3D claymorphic / soft tactile aesthetic** matching the `#EA7317` brand palette, featuring pill tags, 3D disc step indicators, and interactive telemetry HUD.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React + Leaflet Dashboard                   │
│  - 3D Claymorphic tactile controls & live telemetry HUD     │
│  - Real-time vehicle location & spoilage risk markers       │
│  - Dynamic road blockage & temperature spike injection      │
└──────────────────────────────▲──────────────────────────────┘
                               │ WebSocket / REST
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Dispatch Backend                 │
│  - Telemetry ingestion & reroute coordinator                │
└──────────────┬──────────────────────────────┬───────────────┘
               ▼                              ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      CSP Dispatcher         │ │  Perishable-Aware A* Router │
│ - Vehicle payload bounds    │ │ - Road graph (NetworkX)     │
│ - Max shelf-life deadlines  │ │ - Euclidean admissible h(n) │
│ - Driver max drive hours    │ │ - Congestion & temp penalty │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## 🧮 Mathematical Guarantees & Algorithmic Core

### 1. Constraint Satisfaction Problem (CSP) Fleet Scheduling
Before any vehicle departs, orders collected across farms and hubs are assigned to available fleet vehicles (Reefers vs Standard Dry Vans) without violating:
* **Payload Capacity ($W_{\max}$):** $\sum_{o \in v} w_o \le W_{\max}(v)$
* **Driver Duty Limit ($T_{\max}$):** $\sum t_{\text{transit}} + t_{\text{return\_to\_hub}} \le T_{\max}(v)$
* **Perishable Expiry Deadline ($Dead_i$):** $t_{\text{arrival}}(o) \le \text{ExpiryWindow}(o) \times \text{Multiplier}_{\text{reefer}}$

### 2. Quality-Weighted $A^*$ Search Engine
Standard GPS routing optimizes for distance or base transit time. For perishable goods, heat exposure causes exponential decay.

The edge cost function from node $u$ to $v$ is modeled as:

$$c(u, v) = \text{base\_time}(u, v) \times \left(1 + \alpha \cdot \text{Congestion}(u, v) + \beta \cdot \text{AmbientTempPenalty}\right)$$

* **Active Chilled Reefer:** Onboard cooling maintains $2^\circ\text{C} - 6^\circ\text{C}$, so $\text{AmbientTempPenalty} \approx 0$.
* **Standard Dry Van:** Unrefrigerated crates absorb solar heat; when ambient temperature exceeds $15^\circ\text{C}$, penalties escalate rapidly:
  $$\text{temp\_penalty} = \max\left(0, \frac{\text{ambient\_temp} - 15.0}{5.0}\right)$$

### 3. Heuristic Admissibility & Consistency Proof
The $A^*$ heuristic is Euclidean distance divided by maximum vehicle cruising speed ($v_{\max}$):

$$h(n) = \frac{\text{Euclidean}(n, \text{goal})}{v_{\max}}$$

* **Admissibility ($h(n) \le h^*(n)$):** Because straight-line distance is always $\le$ actual road distance, and vehicle speed $\le v_{\max}$, $h(n)$ is a guaranteed lower bound on the true remaining cost.
* **Consistency ($h(n) \le c(n, p) + h(p)$):** By the triangle inequality on metric surfaces, $A^*$ guarantees global optimality on the first expansion of any node without requiring re-opening.

---

## 🚀 Running the Prototype

### Quick Launch
Run the automated launcher:
```powershell
.\start_all.bat
```

Or run services individually:

#### 1. Backend (FastAPI)
```powershell
.\.venv\Scripts\activate
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
* **API Health:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
* **Interactive OpenAPI Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Built Dashboard:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

#### 2. Frontend (React + Vite)
```powershell
cd frontend
npm run dev
```
* **Frontend Dev Server:** [http://localhost:5173/](http://localhost:5173/)

---

## 🎨 UI Features (Following Tactile 3D Clay Aesthetic)

* **Hero System:** Chunky headers, 3D disc step indicators (1, 2, 3), and brand `#EA7317` button.
* **Interactive Leaflet Map:** Custom 3D pins for Central Cold Hub, Hydroponic Farms, Sorting Facilities, and Hypermarkets; color-coded trajectories with animated moving trucks.
* **Live IoT Telemetry HUD:** Animated scrubber (0% to 100%), 1x/2x/5x playback speeds, internal cargo temperature vs ambient sensor readings, and **Produce Deterioration Index (PDI)** gauges.
* **Dynamic Disruption Injection:** Slider-driven traffic congestion (1x to 6x) and ambient heat spikes (20°C to 52°C) with instant $A^*$ reroute comparison.
* **CSP Solver Inspector:** Forward-checking backtrack log, payload capacity bars, driver shift utilization, and shelf-life margin checks.
* **Produce Taxonomy & Custom Order Generator:** Real produce categories (Strawberries, Spinach, Heirloom Tomatoes, Dairy/Cheese) with temperature sensitivity profiles and on-the-fly dispatch injection.
* **Algorithmic Proof Modal:** Detailed mathematical breakdown of admissibility, monotonicity, and hierarchical AI separation of concerns.

