// ----- KONSTANTEN -----
const DEFAULT_GROUPS = ["Favoriten", "Soziale Netzwerke", "Tools"];
const defaultSites = [
  { name: "Google", url: "https://google.com", group: "" },
  { name: "Github", url: "https://github.com", group: "" },
];
let editMode = false;
let folderEditMode = false; // Bearbeiten-Modus für Ordner-Overlay
let openedFolder = null;

// Speicher-Funktionen
function loadSites() {
  const stored = localStorage.getItem("launcherSitesGroups");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...defaultSites];
    }
  }
  return [...defaultSites];
}
function saveSites(sites) {
  localStorage.setItem("launcherSitesGroups", JSON.stringify(sites));
}
function getCombinedOrder(sites) {
  const order = JSON.parse(
    localStorage.getItem("launcherCombinedOrder") || "null"
  );
  if (order && Array.isArray(order)) {
    const singles = sites.filter((s) => !s.group || s.group === "");
    const groups = Array.from(
      new Set(
        sites.filter((s) => s.group && s.group !== "").map((s) => s.group)
      )
    );
    return order.filter((entry) => {
      if (entry.type === "site") return !!singles[entry.i];
      if (entry.type === "group") return groups.includes(entry.name);
      return false;
    });
  } else {
    const singles = sites.filter((s) => !s.group || s.group === "");
    const groups = Array.from(
      new Set(
        sites.filter((s) => s.group && s.group !== "").map((s) => s.group)
      )
    );
    let arr = [];
    singles.forEach((s, i) => arr.push({ type: "site", i }));
    groups.forEach((name) => arr.push({ type: "group", name }));
    localStorage.setItem("launcherCombinedOrder", JSON.stringify(arr));
    return arr;
  }
}
function saveCombinedOrder(order) {
  localStorage.setItem("launcherCombinedOrder", JSON.stringify(order));
}

// Modal für neue Gruppe + Website
const groupModal = document.createElement("div");
groupModal.className = "modal-group";
groupModal.innerHTML = `
  <button class="close-modal-group" id="closeGroupModal" title="Schließen">&times;</button>
  <div class="modal-content-group">
    <form id="addGroupForm">
      <label for="groupName">Name der Gruppe (Ordner):</label>
      <input type="text" id="groupName" required maxlength="30" placeholder="z.B. Games">
      <label for="siteNameGroup">Name der Website:</label>
      <input type="text" id="siteNameGroup" required maxlength="30" placeholder="z.B. Wikipedia">
      <label for="siteURLGroup">URL der Website:</label>
      <input type="url" id="siteURLGroup" required placeholder="z.B. https://wikipedia.org">
      <button type="submit" id="submitGroupBtn">Gruppe + Website hinzufügen</button>
    </form>
  </div>
`;
document.body.appendChild(groupModal);
const closeGroupModalBtn = groupModal.querySelector("#closeGroupModal");
const addGroupForm = groupModal.querySelector("#addGroupForm");
const groupNameInput = groupModal.querySelector("#groupName");
const siteNameGroupInput = groupModal.querySelector("#siteNameGroup");
const siteURLGroupInput = groupModal.querySelector("#siteURLGroup");
document.getElementById("openGroupModalBtn").onclick = () => {
  groupModal.classList.add("active");
  addGroupForm.reset();
  setTimeout(() => groupNameInput.focus(), 50);
};
closeGroupModalBtn.onclick = closeGroupModal;
function closeGroupModal() {
  groupModal.classList.remove("active");
  addGroupForm.reset();
}
groupModal.onclick = function (e) {
  if (e.target === groupModal) closeGroupModal();
};
addGroupForm.onsubmit = function (e) {
  e.preventDefault();
  const group = groupNameInput.value.trim();
  const name = siteNameGroupInput.value.trim();
  const url = siteURLGroupInput.value.trim();
  if (!group || !name || !url.match(/^https?:\/\/.+/i)) {
    alert("Bitte alle Felder ausfüllen und eine gültige URL angeben!");
    return;
  }
  let sites = loadSites();
  if (sites.some((s) => s.group === group)) {
    alert("Diese Gruppe existiert bereits!");
    return;
  }
  sites.push({ name, url, group });
  saveSites(sites);
  let singles = sites.filter((s) => !s.group || s.group === "");
  let groups = Array.from(
    new Set(sites.filter((s) => s.group && s.group !== "").map((s) => s.group))
  );
  let arr = [];
  singles.forEach((s, i) => arr.push({ type: "site", i }));
  groups.forEach((name) => arr.push({ type: "group", name }));
  saveCombinedOrder(arr);
  closeGroupModal();
  renderSites();
};

// Modal für neue Website
const addModal = document.getElementById("addModal");
const closeModalBtn = document.getElementById("closeModal");
const addSiteForm = document.getElementById("addSiteForm");
const siteNameInput = document.getElementById("siteName");
const siteURLInput = document.getElementById("siteURL");
const siteGroupSelect = document.getElementById("siteGroup");
const submitBtn = document.getElementById("submitBtn");
let editIndex = null;
let addDefaultGroupSet = null;
function openAddModal(
  idx = null,
  site = null,
  preselectGroup = null,
  underFolderOverlay = false
) {
  addModal.classList.add("active");
  editIndex = idx;
  addDefaultGroupSet = preselectGroup;
  renderGroupSelect(site?.group ?? preselectGroup ?? "");
  if (site) {
    siteNameInput.value = site.name;
    siteURLInput.value = site.url;
    submitBtn.textContent = "Speichern";
  } else {
    addSiteForm.reset();
    submitBtn.textContent = "Hinzufügen";
  }
  setTimeout(() => siteNameInput.focus(), 50);
}
function closeAddModal() {
  addModal.classList.remove("active");
  addSiteForm.reset();
  editIndex = null;
  addDefaultGroupSet = null;
}
closeModalBtn.onclick = closeAddModal;
addModal.onclick = function (e) {
  if (e.target === addModal) closeAddModal();
};
siteGroupSelect.addEventListener("change", function () {
  if (siteGroupSelect.value === "__new__") {
    groupModal.classList.add("active");
    setTimeout(() => groupNameInput.focus(), 50);
  }
});
addSiteForm.onsubmit = function (e) {
  e.preventDefault();
  const name = siteNameInput.value.trim();
  const url = siteURLInput.value.trim();
  let group = siteGroupSelect.value;
  if (group === "__new__") {
    groupModal.classList.add("active");
    return;
  }
  let sites = loadSites();
  if (!name || !url.match(/^https?:\/\/.+/i)) {
    alert(
      "Bitte gib einen gültigen Namen und eine gültige URL ein (mit http(s)://)"
    );
    return;
  }
  if (editIndex !== null) {
    sites[editIndex] = { name, url, group };
  } else {
    sites.push({ name, url, group });
  }
  saveSites(sites);
  let singles = sites.filter((s) => !s.group || s.group === "");
  let groups = Array.from(
    new Set(sites.filter((s) => s.group && s.group !== "").map((s) => s.group))
  );
  let arr = [];
  singles.forEach((s, i) => arr.push({ type: "site", i }));
  groups.forEach((name) => arr.push({ type: "group", name }));
  saveCombinedOrder(arr);
  renderSites();
  if (openedFolder) renderFolderOverlay(openedFolder);
  closeAddModal();
};
function renderGroupSelect(selected) {
  siteGroupSelect.innerHTML = `<option value=""${
    !selected ? " selected" : ""
  }>-- Keine Gruppe --</option>`;
  let sites = loadSites();
  Array.from(
    new Set(sites.filter((s) => s.group && s.group !== "").map((s) => s.group))
  ).forEach((g) => {
    const o = document.createElement("option");
    o.value = g;
    o.textContent = g;
    if (selected && g === selected) o.selected = true;
    siteGroupSelect.appendChild(o);
  });
  const o = document.createElement("option");
  o.value = "__new__";
  o.textContent = "➕ Neue Gruppe ...";
  siteGroupSelect.appendChild(o);
}

// Favicon-Logik
function getFaviconUrls(siteUrl) {
  try {
    const url = new URL(siteUrl);
    const domain = url.hostname;
    const protocol = url.protocol;
    return [
      `${protocol}//${domain}/favicon.ico`,
      `https://www.google.com/s2/favicons?sz=128&domain_url=${siteUrl}`,
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Globe_icon.svg/128px-Globe_icon.svg.png",
    ];
  } catch {
    return [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Globe_icon.svg/128px-Globe_icon.svg.png",
    ];
  }
}

// Haupt-Grid Startseite
function renderSites() {
  const container = document.getElementById("groupsContainer");
  container.innerHTML = "";
  // "+" Website hinzufügen
  const addSiteTile = document.createElement("div");
  addSiteTile.className = "add-site-tile";
  addSiteTile.title = "Website hinzufügen";
  addSiteTile.innerHTML = "<span>+</span>";
  addSiteTile.onclick = () => openAddModal();
  container.appendChild(addSiteTile);

  let sites = loadSites();
  let singles = sites.filter((s) => !s.group || s.group === "");
  let groups = Array.from(
    new Set(sites.filter((s) => s.group && s.group !== "").map((s) => s.group))
  );

  let order = getCombinedOrder(sites);
  let draggedIdx = null;
  let draggedElem = null;

  order.forEach((entry, idx) => {
    if (entry.type === "site") {
      const site = singles[entry.i];
      if (!site) return;
      const tile = document.createElement("div");
      tile.className = "single-tile";
      tile.title = site.name + "\n" + site.url;
      tile.draggable = editMode;
      tile.onclick = (e) => {
        if (editMode) return;
        window.open(site.url, "_blank");
      };
      if (editMode) {
        tile.ondragstart = (e) => {
          draggedIdx = idx;
          draggedElem = tile;
          setTimeout(() => tile.classList.add("drag-over"), 1);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
              url: site.url,
              name: site.name,
              group: "",
              type: "site",
            })
          );
        };
        tile.ondragend = (e) => {
          draggedIdx = null;
          draggedElem = null;
          document
            .querySelectorAll(".single-tile.drag-over,.folder-tile.drag-over")
            .forEach((el) => el.classList.remove("drag-over"));
        };
        tile.ondragover = (e) => {
          e.preventDefault();
          if (draggedElem && draggedElem !== tile)
            tile.classList.add("drag-over");
        };
        tile.ondragleave = (e) => tile.classList.remove("drag-over");
        tile.ondrop = (e) => {
          e.preventDefault();
          if (draggedIdx !== null && draggedIdx !== idx) {
            let arr = [...order];
            const [dragged] = arr.splice(draggedIdx, 1);
            arr.splice(idx, 0, dragged);
            saveCombinedOrder(arr);
            renderSites();
          }
        };
      }
      const icon = document.createElement("img");
      const iconUrls = getFaviconUrls(site.url);
      let iconStep = 0;
      icon.src = iconUrls[iconStep];
      icon.alt = site.name;
      icon.onerror = function () {
        iconStep++;
        if (iconStep < iconUrls.length) {
          this.onerror = null;
          this.src = iconUrls[iconStep];
          this.onerror = arguments.callee;
        }
      };
      tile.appendChild(icon);

      const tileTitle = document.createElement("div");
      tileTitle.className = "folder-title";
      tileTitle.textContent = site.name;
      tile.appendChild(tileTitle);

      if (editMode) {
        const overlay = document.createElement("div");
        overlay.className = "edit-folder-overlay";
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "edit-tile-btn";
        editBtn.title = "Bearbeiten";
        editBtn.innerHTML = "✏️";
        editBtn.onclick = (e) => {
          e.stopPropagation();
          openAddModal(
            sites.findIndex(
              (s0) =>
                s0.url === site.url &&
                s0.name === site.name &&
                (!s0.group || s0.group === "")
            ),
            site,
            ""
          );
        };
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "edit-tile-btn";
        removeBtn.title = "Löschen";
        removeBtn.innerHTML = "🗑️";
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm(`Möchtest du „${site.name}“ wirklich entfernen?`)) {
            let updatedSites = loadSites().filter(
              (s0) =>
                !(
                  s0.url === site.url &&
                  s0.name === site.name &&
                  (!s0.group || s0.group === "")
                )
            );
            saveSites(updatedSites);
            let singlesNew = updatedSites.filter(
              (s) => !s.group || s.group === ""
            );
            let groupsNew = Array.from(
              new Set(
                updatedSites
                  .filter((s) => s.group && s.group !== "")
                  .map((s) => s.group)
              )
            );
            let arr = [];
            singlesNew.forEach((s, i) => arr.push({ type: "site", i }));
            groupsNew.forEach((name) => arr.push({ type: "group", name }));
            saveCombinedOrder(arr);
            renderSites();
          }
        };
        overlay.appendChild(editBtn);
        overlay.appendChild(removeBtn);
        tile.appendChild(overlay);
      }
      container.appendChild(tile);
    } else if (entry.type === "group") {
      const group = entry.name;
      if (!groups.includes(group)) return;
      const groupSites = sites.filter((s) => (s.group || "") === group);
      if (groupSites.length === 0) return;
      const folder = document.createElement("div");
      folder.className = "folder-tile";
      folder.setAttribute("data-group", group);
      folder.draggable = editMode;
      folder.onclick = function (e) {
        if (editMode && e.target.classList.contains("edit-folder-btn")) return;
        if (editMode) return;
        openFolderOverlay(group);
      };
      if (editMode) {
        folder.ondragstart = (e) => {
          draggedIdx = idx;
          draggedElem = folder;
          setTimeout(() => folder.classList.add("drag-over"), 1);
          e.dataTransfer.effectAllowed = "move";
        };
        folder.ondragend = (e) => {
          draggedIdx = null;
          draggedElem = null;
          document
            .querySelectorAll(".folder-tile.drag-over,.single-tile.drag-over")
            .forEach((el) => el.classList.remove("drag-over"));
        };
        folder.ondragover = (e) => {
          e.preventDefault();
          if (draggedElem && draggedElem !== folder)
            folder.classList.add("drag-over");
        };
        folder.ondragleave = (e) => folder.classList.remove("drag-over");
        folder.ondrop = (e) => {
          e.preventDefault();
          let arr = [...order];
          const [dragged] = arr.splice(draggedIdx, 1);
          arr.splice(idx, 0, dragged);
          saveCombinedOrder(arr);
          renderSites();
        };

        // Edit- UND Delete-Button wie bei Websites
        const overlay = document.createElement("div");
        overlay.className = "edit-folder-overlay";

        // EDIT
        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "edit-tile-btn";
        editBtn.title = "Gruppe umbenennen";
        editBtn.innerHTML = "✏️";
        editBtn.onclick = function (e) {
          e.stopPropagation();
          let newName = prompt("Neuer Gruppenname:", group);
          if (!newName || !newName.trim()) return;
          newName = newName.trim();
          if (newName === group) return;
          let updatedSites = loadSites().map((site) =>
            site.group === group ? { ...site, group: newName } : site
          );
          saveSites(updatedSites);
          let singlesNew = updatedSites.filter(
            (s) => !s.group || s.group === ""
          );
          let groupsNew = Array.from(
            new Set(
              updatedSites
                .filter((s) => s.group && s.group !== "")
                .map((s) => s.group)
            )
          );
          let arr = [];
          singlesNew.forEach((s, i) => arr.push({ type: "site", i }));
          groupsNew.forEach((name) => arr.push({ type: "group", name }));
          saveCombinedOrder(arr);
          renderSites();
          if (openedFolder === group) closeFolderOverlay();
        };
        overlay.appendChild(editBtn);

        // DELETE
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "edit-tile-btn";
        removeBtn.title = "Gruppe inkl. aller Websites löschen";
        removeBtn.innerHTML = "🗑️";
        removeBtn.onclick = (e) => {
          e.stopPropagation();
          if (
            confirm(
              `Möchtest du die Gruppe „${group}“ inkl. aller enthaltenen Websites wirklich löschen?`
            )
          ) {
            let updatedSites = loadSites().filter(
              (site) => (site.group || "") !== group
            );
            saveSites(updatedSites);
            let singlesNew = updatedSites.filter(
              (s) => !s.group || s.group === ""
            );
            let groupsNew = Array.from(
              new Set(
                updatedSites
                  .filter((s) => s.group && s.group !== "")
                  .map((s) => s.group)
              )
            );
            let arr = [];
            singlesNew.forEach((s, i) => arr.push({ type: "site", i }));
            groupsNew.forEach((name) => arr.push({ type: "group", name }));
            saveCombinedOrder(arr);
            renderSites();
            if (openedFolder === group) closeFolderOverlay();
          }
        };
        overlay.appendChild(removeBtn);

        folder.appendChild(overlay);
      }
      const previewDiv = document.createElement("div");
      previewDiv.className = "folder-preview-icons";
      groupSites.slice(0, 4).forEach((site) => {
        const icon = document.createElement("img");
        const iconUrls = getFaviconUrls(site.url);
        let iconStep = 0;
        icon.src = iconUrls[iconStep];
        icon.alt = "";
        icon.onerror = function () {
          iconStep++;
          if (iconStep < iconUrls.length) {
            this.onerror = null;
            this.src = iconUrls[iconStep];
            this.onerror = arguments.callee;
          }
        };
        previewDiv.appendChild(icon);
      });
      const folderIcon = document.createElement("span");
      folderIcon.className = "folder-icon";
      folderIcon.textContent = "📁";
      const folderTitle = document.createElement("div");
      folderTitle.className = "folder-title";
      folderTitle.textContent = group;
      folder.appendChild(previewDiv);
      folder.appendChild(folderIcon);
      folder.appendChild(folderTitle);

      container.appendChild(folder);
    }
  });
}

// Overlay-Funktionen für Ordner
const folderOverlay = document.getElementById("folderOverlay");
const folderOverlayTitle = document.getElementById("folderOverlayTitle");
const folderOverlayGrid = document.getElementById("folderOverlayGrid");
const folderOverlayClose = document.getElementById("folderOverlayClose");
const folderOverlayEditBtn = document.getElementById("folderOverlayEditBtn");
const folderEditBar = document.getElementById("folderEditBar");
let draggedSiteIdx = null,
  draggedSiteElem = null,
  draggedSiteGroup = null;

function openFolderOverlay(group) {
  openedFolder = group;
  folderEditMode = false;
  folderEditBar.style.display = "none";
  folderOverlayEditBtn.classList.remove("active");
  folderOverlayEditBtn.style.display = "inline-block";
  folderOverlay.classList.add("active");
  folderOverlayTitle.innerHTML = `<span class="folder-emoji">📁</span>${group}`;
  renderFolderOverlay(group);
}
function closeFolderOverlay() {
  openedFolder = null;
  folderEditMode = false;
  folderEditBar.style.display = "none";
  folderOverlayEditBtn.classList.remove("active");
  folderOverlayEditBtn.style.display = "none";
  folderOverlay.classList.remove("active");
  folderOverlayGrid.innerHTML = "";
}
folderOverlayClose.onclick = closeFolderOverlay;
folderOverlay.onclick = function (e) {
  if (e.target === folderOverlay) closeFolderOverlay();
};
folderOverlayEditBtn.onclick = function () {
  folderEditMode = !folderEditMode;
  folderEditBar.style.display = folderEditMode ? "block" : "none";
  folderOverlayEditBtn.classList.toggle("active", folderEditMode);
  if (openedFolder) renderFolderOverlay(openedFolder);
};
function renderFolderOverlay(group) {
  let sites = loadSites();
  let groupSites = sites.filter((s) => (s.group || "") === group);
  folderOverlayGrid.innerHTML = "";
  groupSites.forEach((site, idx) => {
    const a = document.createElement("div");
    a.className = "tile-inner";
    a.setAttribute("data-site-idx", idx);

    if (folderEditMode) {
      a.draggable = true;
      a.ondragstart = (e) => {
        draggedSiteIdx = idx;
        draggedSiteGroup = group;
        draggedSiteElem = a;
        setTimeout(() => a.classList.add("drag-over"), 1);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            url: site.url,
            name: site.name,
            group: group,
            type: "site",
          })
        );
      };
      a.ondragend = (e) => {
        draggedSiteIdx = null;
        draggedSiteGroup = null;
        draggedSiteElem = null;
        document
          .querySelectorAll(".tile-inner.drag-over")
          .forEach((el) => el.classList.remove("drag-over"));
      };
      a.ondragover = (e) => {
        e.preventDefault();
        if (draggedSiteElem && draggedSiteElem !== a)
          a.classList.add("drag-over");
      };
      a.ondragleave = (e) => {
        a.classList.remove("drag-over");
      };
      a.ondrop = (e) => {
        e.preventDefault();
        // --- Nur Plätze tauschen ---
        if (
          draggedSiteIdx !== null &&
          draggedSiteGroup === group &&
          draggedSiteIdx !== idx
        ) {
          let arr = [...groupSites];
          [arr[draggedSiteIdx], arr[idx]] = [arr[idx], arr[draggedSiteIdx]];
          let otherSites = sites.filter((s) => (s.group || "") !== group);
          saveSites([...otherSites, ...arr]);
          renderSites();
          renderFolderOverlay(group);
        }
      };
    }

    const icon = document.createElement("img");
    icon.alt = site.name;
    const iconUrls = getFaviconUrls(site.url);
    let iconStep = 0;
    icon.src = iconUrls[iconStep];
    icon.onerror = function () {
      iconStep++;
      if (iconStep < iconUrls.length) {
        this.onerror = null;
        this.src = iconUrls[iconStep];
        this.onerror = arguments.callee;
      }
    };
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = site.name;

    if (folderEditMode) {
      // --- Container für die Buttons (vertikal übereinander) ---
      const btnWrap = document.createElement("div");
      btnWrap.className = "edit-folder-overlay";

      // --- EDIT BUTTON (oben) ---
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "edit-tile-btn";
      editBtn.title = "Bearbeiten";
      editBtn.innerHTML = "✏️";
      editBtn.onclick = (e) => {
        e.stopPropagation();
        openAddModal(
          sites.findIndex(
            (s0) =>
              s0.url === site.url &&
              s0.name === site.name &&
              (s0.group || "") === group
          ),
          site,
          group,
          true
        );
      };

      // --- DELETE BUTTON (unten) ---
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "edit-tile-btn";
      removeBtn.title = "Löschen";
      removeBtn.innerHTML = "🗑️";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm(`Möchtest du „${site.name}“ wirklich entfernen?`)) {
          let updatedSites = loadSites().filter(
            (s0) =>
              !(
                s0.url === site.url &&
                s0.name === site.name &&
                (s0.group || "") === group
              )
          );
          saveSites(updatedSites);
          renderSites();
          renderFolderOverlay(group);
        }
      };

      btnWrap.appendChild(editBtn);
      btnWrap.appendChild(removeBtn);
      a.appendChild(btnWrap);
    }

    a.onclick = (e) => {
      if (folderEditMode) return;
      window.open(site.url, "_blank");
    };
    a.appendChild(icon);
    a.appendChild(label);
    folderOverlayGrid.appendChild(a);
  });

  if (folderEditMode) {
    const dropZone = document.createElement("div");
    dropZone.style.height = "36px";
    dropZone.style.border = "2.5px dashed #2c85ff";
    dropZone.style.borderRadius = "10px";
    dropZone.style.display = "flex";
    dropZone.style.alignItems = "center";
    dropZone.style.justifyContent = "center";
    dropZone.style.color = "#2c85ff";
    dropZone.textContent = "Hierher ziehen, um ans Ende zu legen";
    dropZone.ondragover = (e) => e.preventDefault();
    dropZone.ondrop = (e) => {
      e.preventDefault();
      let dataStr = e.dataTransfer.getData("text/plain");
      let data = {};
      try {
        data = JSON.parse(dataStr);
      } catch {}
      if (draggedSiteIdx !== null && draggedSiteGroup === group) {
        let arr = [...groupSites];
        const [dragged] = arr.splice(draggedSiteIdx, 1);
        arr.push(dragged);
        let otherSites = sites.filter((s) => (s.group || "") !== group);
        saveSites([...otherSites, ...arr]);
        renderSites();
        renderFolderOverlay(group);
      } else if (data && data.type === "site") {
        let allSites = loadSites();
        let siteIdx = allSites.findIndex(
          (s) =>
            s.url === data.url &&
            s.name === data.name &&
            (s.group || "") === (data.group || "")
        );
        if (siteIdx !== -1) {
          let movedSite = { ...allSites[siteIdx], group: group };
          allSites.splice(siteIdx, 1);
          let otherSites = allSites.filter((s) => (s.group || "") !== group);
          let targetGroupSites = allSites.filter(
            (s) => (s.group || "") === group
          );
          targetGroupSites.push(movedSite);
          saveSites([...otherSites, ...targetGroupSites]);
          renderSites();
          renderFolderOverlay(group);
        }
      }
    };
    folderOverlayGrid.appendChild(dropZone);
  }

  const addTile = document.createElement("div");
  addTile.className = "tile-inner add-site-tile";
  addTile.title = "Seite hinzufügen";
  addTile.innerHTML = "<span>+</span>";
  addTile.onclick = () => openAddModal(null, null, group, true);
  folderOverlayGrid.appendChild(addTile);
}

// Edit-Modus (global)
const globalEditBtn = document.getElementById("globalEditBtn");
const editModeBar = document.getElementById("editModeBar");
globalEditBtn.onclick = function () {
  editMode = !editMode;
  globalEditBtn.classList.toggle("active", editMode);
  editModeBar.classList.toggle("active", editMode);
  closeFolderOverlay();
  renderSites();
};

// Start
renderSites();
