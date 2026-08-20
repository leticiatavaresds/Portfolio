(function () {
  const config = window.siteEditorConfig || {};
  if (!config.editMode) {
    return;
  }

  const metaUrl = config.metaUrl || "/api/admin/meta";
  const rowsUrlBase = config.rowsUrlBase || "/api/admin";
  const uploadUrl = config.uploadUrl || "/api/admin/upload";
  const assetsUrlBase = config.assetsUrlBase || "/api/admin/assets";
  const initialParams = new URLSearchParams(window.location.search);

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      let message = "Falha na requisicao.";
      try {
        const data = await response.json();
        if (data.error) {
          message = data.error;
        }
      } catch (error) {
        console.error(error);
      }
      throw new Error(message);
    }
    return response.json();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const monthMapEn = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12"
  };

  const monthMapPt = {
    jan: "01",
    fev: "02",
    mar: "03",
    abr: "04",
    mai: "05",
    jun: "06",
    jul: "07",
    ago: "08",
    set: "09",
    out: "10",
    nov: "11",
    dez: "12"
  };

  const monthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNamesPt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  function parseMonthYearToInput(value, locale) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    const match = raw.match(/^([A-Za-zÀ-ÿ]{3}),\s*(\d{4})$/);
    if (!match) {
      return "";
    }

    const monthToken = match[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const year = match[2];
    const month = (locale === "pt" ? monthMapPt : monthMapEn)[monthToken];
    return month ? `${year}-${month}` : "";
  }

  function formatInputToMonthYear(value, locale) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }

    const match = raw.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return raw;
    }

    const year = match[1];
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      return raw;
    }

    const monthName = locale === "pt" ? monthNamesPt[monthIndex] : monthNamesEn[monthIndex];
    return `${monthName}, ${year}`;
  }

  function buildFieldMarkup(column, value, prefix, options = {}) {
    const safeValue = value ?? "";
    const inputId = `${prefix}-field-${column.name}`;
    const isLongText = column.type === "TEXT" && String(safeValue).length > 120;
    const isColorField = column.name === "CorEfeito";
    const isCertificateEditor = prefix === "certificate-editor";
    const isAreaGroupField = isCertificateEditor && column.name === "AreaGroup";
    const isCertificateDateField = isCertificateEditor && column.name === "Data";
    const isCertificateImageField = isCertificateEditor && column.name === "Image";
    const isBadgeImageField = prefix === "badge-editor" && column.name === "Image";

    if (isLongText) {
      return `
        <label class="editor-toolbar__field" for="${inputId}">
          <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
          <textarea id="${inputId}" class="editor-toolbar__textarea" data-column="${escapeHtml(column.name)}">${escapeHtml(safeValue)}</textarea>
        </label>
      `;
    }

    if (isAreaGroupField) {
      const normalized = String(safeValue || "computing").trim().toLowerCase() || "computing";
      return `
        <label class="editor-toolbar__field" for="${inputId}">
          <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
          <select id="${inputId}" class="editor-toolbar__input" data-column="${escapeHtml(column.name)}">
            <option value="computing"${normalized === "computing" ? " selected" : ""}>Computing</option>
            <option value="audiovisual"${normalized === "audiovisual" ? " selected" : ""}>Audiovisual</option>
          </select>
        </label>
      `;
    }

    if (isCertificateDateField) {
      const inputValue = parseMonthYearToInput(safeValue, "en") || parseMonthYearToInput(safeValue, "pt");
      return `
        <label class="editor-toolbar__field" for="${inputId}">
          <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
          <input id="${inputId}" class="editor-toolbar__input" type="month" data-column="${escapeHtml(column.name)}" data-date-locale="en" value="${escapeHtml(inputValue)}">
        </label>
      `;
    }

    if (isCertificateImageField) {
      const imageOptions = Array.isArray(options.imageOptions) ? [...options.imageOptions] : [];
      const currentValue = String(safeValue || "").trim();
      if (currentValue && !imageOptions.includes(currentValue)) {
        imageOptions.unshift(currentValue);
      }

      const optionMarkup = [
        '<option value="">Selecione uma imagem</option>',
        ...imageOptions.map((filename) => `<option value="${escapeHtml(filename)}"${filename === currentValue ? " selected" : ""}>${escapeHtml(filename)}</option>`)
      ].join("");

      return `
        <label class="editor-toolbar__field" for="${inputId}">
          <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
          <select id="${inputId}" class="editor-toolbar__input" data-column="${escapeHtml(column.name)}">
            ${optionMarkup}
          </select>
        </label>
      `;
    }

    if (isBadgeImageField) {
      const imageOptions = Array.isArray(options.imageOptions) ? [...options.imageOptions] : [];
      const currentValue = String(safeValue || "").trim();
      if (currentValue && !imageOptions.includes(currentValue)) {
        imageOptions.unshift(currentValue);
      }

      const optionMarkup = [
        '<option value="">Selecione uma imagem</option>',
        ...imageOptions.map((filename) => `<option value="${escapeHtml(filename)}"${filename === currentValue ? " selected" : ""}>${escapeHtml(filename)}</option>`)
      ].join("");

      return `
        <label class="editor-toolbar__field" for="${inputId}">
          <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
          <select id="${inputId}" class="editor-toolbar__input" data-column="${escapeHtml(column.name)}">
            ${optionMarkup}
          </select>
        </label>
      `;
    }

    const inputType = column.type === "INTEGER" ? "number" : (isColorField ? "color" : "text");
    const inputValue = isColorField ? (String(safeValue).trim() || "#10e3e6") : safeValue;
    if (isColorField) {
      return `
        <label class="editor-toolbar__field" for="${inputId}">
          <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
          <div class="editor-color-field">
            <input id="${inputId}" class="editor-toolbar__input editor-toolbar__input--color" type="color" data-color-input value="${escapeHtml(inputValue)}">
            <input class="editor-toolbar__input editor-toolbar__input--color-text" type="text" data-column="${escapeHtml(column.name)}" data-color-text value="${escapeHtml(inputValue)}" placeholder="#10e3e6" spellcheck="false" autocomplete="off">
            <span class="editor-color-preview" data-color-preview style="background-color: ${escapeHtml(inputValue)};"></span>
            <span class="editor-color-value" data-color-value>${escapeHtml(inputValue)}</span>
          </div>
        </label>
      `;
    }

    return `
      <label class="editor-toolbar__field" for="${inputId}">
        <span class="editor-toolbar__label">${escapeHtml(column.label || column.name)}</span>
        <input id="${inputId}" class="editor-toolbar__input" type="${inputType}" data-column="${escapeHtml(column.name)}" value="${escapeHtml(inputValue)}">
      </label>
    `;
  }

  function collectFormData(formElement) {
    const payload = {};
    formElement.querySelectorAll("[data-column]").forEach((field) => {
      if (field.dataset.dateLocale) {
        payload[field.dataset.column] = formatInputToMonthYear(field.value, field.dataset.dateLocale);
      } else {
        payload[field.dataset.column] = field.value;
      }
    });
    return payload;
  }

  async function saveTableRecord(tableName, formElement, statusSetter, recordId = null) {
    const payload = collectFormData(formElement);
    const isEditing = Number.isFinite(recordId) && recordId > 0;
    await requestJson(isEditing ? `${rowsUrlBase}/${tableName}/rows/${recordId}` : `${rowsUrlBase}/${tableName}/rows`, {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (typeof statusSetter === "function") {
      statusSetter("Registro salvo. Recarregando a pagina...");
    }
    window.location.reload();
  }

  function bindColorPreview(formElement) {
    if (!formElement) {
      return;
    }

    formElement.querySelectorAll("[data-color-text]").forEach((textInput) => {
      const field = textInput.closest(".editor-color-field");
      const colorInput = field?.querySelector("[data-color-input]");
      const preview = field?.querySelector("[data-color-preview]");
      const valueLabel = field?.querySelector("[data-color-value]");
      const fallbackColor = "#10e3e6";

      const normalizeColor = function (value) {
        const trimmed = String(value || "").trim();
        if (!trimmed) {
          return fallbackColor;
        }

        const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
        return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : null;
      };

      const sync = function () {
        const normalized = normalizeColor(textInput.value);
        const displayValue = normalized || textInput.value;
        if (preview) {
          preview.style.backgroundColor = normalized || fallbackColor;
        }
        if (valueLabel) {
          valueLabel.textContent = displayValue;
        }
        if (colorInput && normalized) {
          colorInput.value = normalized;
        }
      };

      colorInput?.addEventListener("input", function () {
        textInput.value = colorInput.value;
        sync();
      });
      textInput.addEventListener("input", sync);
      textInput.addEventListener("change", sync);
      sync();
    });
  }

  function initializePageEditor() {
    const elements = {
      status: document.getElementById("editor-status"),
      sectionSelect: document.getElementById("editor-section"),
      tableSelect: document.getElementById("editor-table"),
      rowSelect: document.getElementById("editor-row"),
      form: document.getElementById("editor-form"),
      newButton: document.getElementById("editor-new"),
      saveButton: document.getElementById("editor-save"),
      deleteButton: document.getElementById("editor-delete"),
      moveUpButton: document.getElementById("editor-move-up"),
      moveDownButton: document.getElementById("editor-move-down"),
      uploadTargetSelect: document.getElementById("editor-upload-target"),
      uploadFileInput: document.getElementById("editor-upload-file"),
      uploadButton: document.getElementById("editor-upload-button"),
      uploadResult: document.getElementById("editor-upload-result")
    };

    if (!elements.status || !elements.sectionSelect || !elements.tableSelect || !elements.rowSelect || !elements.form) {
      return;
    }

    const state = {
      tables: [],
      filteredTables: [],
      uploadTargets: [],
      currentSection: "all",
      currentTable: null,
      currentRowId: null,
      rows: [],
      mode: "edit",
      initialSection: initialParams.get("section") || "all",
      initialTableName: initialParams.get("table"),
      initialRowId: initialParams.get("row") ? Number(initialParams.get("row")) : null,
      initialNew: initialParams.get("new") === "1"
    };

    function setStatus(message) {
      elements.status.textContent = message;
    }

    function setUploadResult(message) {
      if (elements.uploadResult) {
        elements.uploadResult.textContent = message;
      }
    }

    function getRowLabel(table, row) {
      const candidates = (table.text_columns || []).map((column) => row[column]).filter(Boolean);
      if (candidates.length > 0) {
        return candidates.slice(0, 2).join(" | ");
      }
      return `Registro ${row.id}`;
    }

    function renderSectionOptions() {
      const sections = new Map();
      sections.set("all", "Todas");
      state.tables.forEach((table) => {
        if (!sections.has(table.section)) {
          sections.set(table.section, table.section_label);
        }
      });

      elements.sectionSelect.innerHTML = Array.from(sections.entries())
        .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
        .join("");
      elements.sectionSelect.value = state.currentSection;
    }

    function applyTableFilter() {
      state.filteredTables = state.currentSection === "all"
        ? [...state.tables]
        : state.tables.filter((table) => table.section === state.currentSection);
    }

    function renderTableOptions() {
      applyTableFilter();
      elements.tableSelect.innerHTML = state.filteredTables
        .map((table) => `<option value="${table.name}">${escapeHtml(table.label)}</option>`)
        .join("");
    }

    function updateUploadTargetSelection() {
      if (elements.uploadTargetSelect && state.currentTable?.upload_target) {
        elements.uploadTargetSelect.value = state.currentTable.upload_target;
      }
    }

    function renderUploadTargets() {
      if (!elements.uploadTargetSelect) {
        return;
      }

      elements.uploadTargetSelect.innerHTML = state.uploadTargets
        .map((target) => `<option value="${target.name}">${escapeHtml(target.label)}</option>`)
        .join("");
      updateUploadTargetSelection();
    }

    function renderRowOptions() {
      if (!state.currentTable) {
        elements.rowSelect.innerHTML = "";
        return;
      }

      const placeholder = '<option value="">Selecione um registro</option>';
      const options = state.rows
        .map((row) => `<option value="${row.id}">${escapeHtml(getRowLabel(state.currentTable, row))}</option>`)
        .join("");

      elements.rowSelect.innerHTML = placeholder + options;
      elements.rowSelect.value = state.currentRowId ? String(state.currentRowId) : "";
    }

    function renderForm(row) {
      if (!state.currentTable) {
        elements.form.innerHTML = "";
        return;
      }

      const currentRow = row || {};
      elements.form.innerHTML = state.currentTable.columns
        .map((column) => buildFieldMarkup(column, currentRow[column.name], "editor"))
        .join("");
      bindColorPreview(elements.form);

      const hasSelectedRow = Boolean(state.currentRowId);
      if (elements.deleteButton) {
        elements.deleteButton.disabled = !hasSelectedRow;
      }
      if (elements.moveUpButton) {
        elements.moveUpButton.disabled = !hasSelectedRow || !state.currentTable.reorder_enabled;
      }
      if (elements.moveDownButton) {
        elements.moveDownButton.disabled = !hasSelectedRow || !state.currentTable.reorder_enabled;
      }
    }

    async function loadRows(tableName) {
      const data = await requestJson(`${rowsUrlBase}/${tableName}/rows`);
      state.rows = data.rows || [];
      if (state.initialNew) {
        state.currentRowId = null;
        state.mode = "create";
        state.initialNew = false;
      } else if (state.initialRowId) {
        const matchedRow = state.rows.find((row) => row.id === state.initialRowId);
        state.currentRowId = matchedRow ? matchedRow.id : (state.rows[0] ? state.rows[0].id : null);
        state.mode = state.currentRowId ? "edit" : "create";
        state.initialRowId = null;
      } else {
        state.currentRowId = state.rows[0] ? state.rows[0].id : null;
        state.mode = "edit";
      }
      renderRowOptions();
      const activeRow = state.rows.find((row) => row.id === state.currentRowId) || {};
      renderForm(activeRow);
      updateUploadTargetSelection();
      setStatus(state.mode === "create" ? "Novo registro. Preencha os campos e salve." : "Selecione um registro ou crie um novo.");
    }

    async function selectTable(tableName) {
      state.currentTable = state.tables.find((table) => table.name === tableName) || null;
      state.currentRowId = null;
      state.rows = [];
      renderForm({});
      if (!state.currentTable) {
        setStatus("Tabela invalida.");
        return;
      }

      elements.tableSelect.value = tableName;
      setStatus("Carregando registros...");
      await loadRows(state.currentTable.name);
    }

    async function bootstrap() {
      try {
        const data = await requestJson(metaUrl);
        state.tables = data.tables || [];
        state.uploadTargets = data.uploadTargets || [];
        state.currentSection = state.initialSection;

        if (!state.tables.length) {
          setStatus("Nenhuma tabela configurada.");
          return;
        }

        renderSectionOptions();
        renderUploadTargets();
        renderTableOptions();
        const initialTable = state.initialTableName
          ? state.tables.find((table) => table.name === state.initialTableName)
          : (state.filteredTables[0] || state.tables[0]);
        if (!initialTable) {
          setStatus("Nenhuma tabela disponivel para a secao.");
          return;
        }
        if (initialTable.section) {
          state.currentSection = initialTable.section;
          renderSectionOptions();
          renderTableOptions();
        }
        await selectTable(initialTable.name);
      } catch (error) {
        setStatus(error.message);
      }
    }

    elements.sectionSelect.addEventListener("change", async function () {
      state.currentSection = this.value;
      renderTableOptions();
      const nextTable = state.filteredTables[0];
      if (!nextTable) {
        state.currentTable = null;
        state.rows = [];
        state.currentRowId = null;
        renderRowOptions();
        renderForm({});
        setStatus("Nenhuma tabela nesta secao.");
        return;
      }

      try {
        await selectTable(nextTable.name);
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.tableSelect.addEventListener("change", async function () {
      try {
        await selectTable(this.value);
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.rowSelect.addEventListener("change", function () {
      const selectedId = Number(this.value);
      const row = state.rows.find((item) => item.id === selectedId) || {};
      state.currentRowId = Number.isFinite(selectedId) && selectedId > 0 ? selectedId : null;
      state.mode = state.currentRowId ? "edit" : "create";
      renderForm(row);
      setStatus(state.currentRowId ? "Editando registro selecionado." : "Preencha os campos para criar um novo registro.");
    });

    elements.newButton?.addEventListener("click", function () {
      state.mode = "create";
      state.currentRowId = null;
      elements.rowSelect.value = "";
      renderForm({});
      setStatus("Novo registro. Preencha os campos e salve.");
    });

    elements.saveButton?.addEventListener("click", async function () {
      if (!state.currentTable) {
        return;
      }

      const payload = collectFormData(elements.form);
      const isEditing = state.mode === "edit" && state.currentRowId;
      const url = isEditing
        ? `${rowsUrlBase}/${state.currentTable.name}/rows/${state.currentRowId}`
        : `${rowsUrlBase}/${state.currentTable.name}/rows`;
      const method = isEditing ? "PUT" : "POST";

      setStatus("Salvando no PostgreSQL...");

      try {
        await requestJson(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        setStatus("Registro salvo. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.deleteButton?.addEventListener("click", async function () {
      if (!state.currentTable || !state.currentRowId) {
        return;
      }

      if (!window.confirm("Excluir este registro?")) {
        return;
      }

      setStatus("Excluindo registro...");

      try {
        await requestJson(`${rowsUrlBase}/${state.currentTable.name}/rows/${state.currentRowId}`, {
          method: "DELETE"
        });
        setStatus("Registro excluido. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    async function moveRow(direction) {
      if (!state.currentTable || !state.currentRowId || !state.currentTable.reorder_enabled) {
        return;
      }

      setStatus(direction === "up" ? "Subindo registro..." : "Descendo registro...");

      try {
        await requestJson(`${rowsUrlBase}/${state.currentTable.name}/rows/${state.currentRowId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction })
        });
        setStatus("Ordem atualizada. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    }

    elements.moveUpButton?.addEventListener("click", function () {
      moveRow("up");
    });

    elements.moveDownButton?.addEventListener("click", function () {
      moveRow("down");
    });

    elements.uploadButton?.addEventListener("click", async function () {
      const file = elements.uploadFileInput?.files?.[0];
      const target = elements.uploadTargetSelect?.value;

      if (!file || !target) {
        setUploadResult("Escolha um arquivo e um destino.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", target);
      setUploadResult("Enviando arquivo...");

      try {
        const data = await requestJson(uploadUrl, {
          method: "POST",
          body: formData
        });
        const fileInfo = data.file || {};
        setUploadResult(`Enviado: ${fileInfo.filename} em ${fileInfo.path}`);
        elements.uploadFileInput.value = "";
      } catch (error) {
        setUploadResult(error.message);
      }
    });

    bootstrap();
  }

  function initializeSkillModal() {
    const modal = document.getElementById("skill-editor-modal");
    if (!modal) {
      return;
    }

    const elements = {
      title: document.getElementById("skill-editor-title"),
      status: document.getElementById("skill-editor-status"),
      form: document.getElementById("skill-editor-form"),
      saveButton: document.getElementById("skill-editor-save"),
      deleteButton: document.getElementById("skill-editor-delete"),
      uploadFileInput: document.getElementById("skill-editor-upload-file"),
      uploadButton: document.getElementById("skill-editor-upload-button"),
      uploadResult: document.getElementById("skill-editor-upload-result")
    };

    const state = {
      table: null,
      mode: "create",
      currentRowId: null,
      rows: [],
      imageOptions: []
    };

    function setStatus(message) {
      if (elements.status) {
        elements.status.textContent = message;
      }
    }

    function setUploadResult(message) {
      if (elements.uploadResult) {
        elements.uploadResult.textContent = message;
      }
    }

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    function renderForm(row) {
      if (!state.table || !elements.form) {
        return;
      }

      const currentRow = row || {};
      elements.form.innerHTML = state.table.columns
        .map((column) => buildFieldMarkup(column, currentRow[column.name], "skill-editor"))
        .join("");
      bindColorPreview(elements.form);

      if (elements.deleteButton) {
        elements.deleteButton.disabled = !(state.mode === "edit" && state.currentRowId);
      }
      if (elements.title) {
        elements.title.textContent = state.mode === "edit" ? "Editar skill" : "Adicionar skill";
      }
    }

    async function ensureSkillTable() {
      if (state.table) {
        return state.table;
      }

      const data = await requestJson(metaUrl);
      state.table = (data.tables || []).find((table) => table.name === "skills") || null;
      if (!state.table) {
        throw new Error("Tabela de skills nao encontrada.");
      }
      return state.table;
    }

    async function loadRows() {
      const data = await requestJson(`${rowsUrlBase}/skills/rows`);
      state.rows = data.rows || [];
    }

    async function openCreateModal() {
      await ensureSkillTable();
      state.mode = "create";
      state.currentRowId = null;
      renderForm({});
      setStatus("Nova skill. Preencha os campos e salve.");
      setUploadResult("");
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      openModal();
    }

    async function openEditModal(rowId) {
      await ensureSkillTable();
      await loadRows();
      const row = state.rows.find((item) => item.id === rowId);
      if (!row) {
        throw new Error("Skill nao encontrada.");
      }

      state.mode = "edit";
      state.currentRowId = rowId;
      renderForm(row);
      setStatus("Editando skill selecionada.");
      setUploadResult("");
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      openModal();
    }

    document.querySelectorAll("[data-skill-action='create']").forEach((button) => {
      button.addEventListener("click", async function () {
        setStatus("Carregando...");
        try {
          await openCreateModal();
        } catch (error) {
          setStatus(error.message);
          openModal();
        }
      });
    });

    document.querySelectorAll("[data-skill-action='edit']").forEach((button) => {
      button.addEventListener("click", async function () {
        const rowId = Number(this.dataset.skillRowId);
        if (!Number.isFinite(rowId) || rowId <= 0) {
          return;
        }

        setStatus("Carregando...");
        try {
          await openEditModal(rowId);
        } catch (error) {
          setStatus(error.message);
          openModal();
        }
      });
    });

    modal.querySelectorAll("[data-skill-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    elements.saveButton?.addEventListener("click", async function () {
      if (!state.table || !elements.form) {
        return;
      }

      const payload = collectFormData(elements.form);
      const isEditing = state.mode === "edit" && state.currentRowId;
      const url = isEditing
        ? `${rowsUrlBase}/skills/rows/${state.currentRowId}`
        : `${rowsUrlBase}/skills/rows`;
      const method = isEditing ? "PUT" : "POST";

      setStatus("Salvando no PostgreSQL...");

      try {
        await requestJson(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        setStatus("Skill salva. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.deleteButton?.addEventListener("click", async function () {
      if (!(state.mode === "edit" && state.currentRowId)) {
        return;
      }

      if (!window.confirm("Excluir esta skill?")) {
        return;
      }

      setStatus("Excluindo skill...");

      try {
        await requestJson(`${rowsUrlBase}/skills/rows/${state.currentRowId}`, {
          method: "DELETE"
        });
        setStatus("Skill excluida. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.uploadButton?.addEventListener("click", async function () {
      const file = elements.uploadFileInput?.files?.[0];
      if (!file) {
        setUploadResult("Escolha um arquivo.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", "skills");
      setUploadResult("Enviando arquivo...");

      try {
        const data = await requestJson(uploadUrl, {
          method: "POST",
          body: formData
        });
        const fileInfo = data.file || {};
        setUploadResult(`Enviado: ${fileInfo.filename}`);
        elements.uploadFileInput.value = "";
      } catch (error) {
        setUploadResult(error.message);
      }
    });
  }

  function initializeCertificateModal() {
    const modal = document.getElementById("certificate-editor-modal");
    if (!modal) {
      return;
    }

    const elements = {
      status: document.getElementById("certificate-editor-status"),
      form: document.getElementById("certificate-editor-form"),
      saveButton: document.getElementById("certificate-editor-save"),
      deleteButton: document.getElementById("certificate-editor-delete"),
      uploadFileInput: document.getElementById("certificate-editor-upload-file"),
      uploadButton: document.getElementById("certificate-editor-upload-button"),
      uploadResult: document.getElementById("certificate-editor-upload-result")
    };

    const state = {
      table: null,
      mode: "create",
      currentRowId: null,
      rows: []
    };

    function setStatus(message) {
      if (elements.status) {
        elements.status.textContent = message;
      }
    }

    function setUploadResult(message) {
      if (elements.uploadResult) {
        elements.uploadResult.textContent = message;
      }
    }

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    async function ensureCertificateImages() {
      const data = await requestJson(`${assetsUrlBase}/certificates`);
      state.imageOptions = data.files || [];
      return state.imageOptions;
    }

    async function renderForm(row) {
      if (!state.table || !elements.form) {
        return;
      }

      const currentRow = row || {};
      const defaultRow = {
        AreaGroup: "computing",
        ...currentRow
      };

      await ensureCertificateImages();
      elements.form.innerHTML = state.table.columns
        .map((column) => buildFieldMarkup(column, defaultRow[column.name], "certificate-editor", { imageOptions: state.imageOptions }))
        .join("");
      bindColorPreview(elements.form);
      if (elements.deleteButton) {
        elements.deleteButton.disabled = !(state.mode === "edit" && state.currentRowId);
      }
    }

    async function ensureCertificateTable() {
      if (state.table) {
        return state.table;
      }

      const data = await requestJson(metaUrl);
      state.table = (data.tables || []).find((table) => table.name === "certs") || null;
      if (!state.table) {
        throw new Error("Tabela de certificados nao encontrada.");
      }
      return state.table;
    }

    async function loadRows() {
      const data = await requestJson(`${rowsUrlBase}/certs/rows`);
      state.rows = data.rows || [];
    }

    async function openCreateModal() {
      await ensureCertificateTable();
      state.mode = "create";
      state.currentRowId = null;
      await renderForm({});
      setStatus("Novo certificado. Preencha os campos e salve.");
      setUploadResult("");
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      openModal();
    }

    async function openEditModal(rowId) {
      await ensureCertificateTable();
      await loadRows();
      const row = state.rows.find((item) => item.id === rowId);
      if (!row) {
        throw new Error("Certificado nao encontrado.");
      }

      state.mode = "edit";
      state.currentRowId = rowId;
      await renderForm(row);
      setStatus("Editando certificado selecionado.");
      setUploadResult("");
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      openModal();
    }

    document.querySelectorAll("[data-certificate-action='create']").forEach((button) => {
      button.addEventListener("click", async function () {
        setStatus("Carregando...");
        try {
          await openCreateModal();
        } catch (error) {
          setStatus(error.message);
          openModal();
        }
      });
    });

    document.querySelectorAll("[data-certificate-action='edit']").forEach((button) => {
      button.addEventListener("click", async function () {
        const rowId = Number(this.dataset.certificateRowId);
        if (!Number.isFinite(rowId) || rowId <= 0) {
          return;
        }

        setStatus("Carregando...");
        try {
          await openEditModal(rowId);
        } catch (error) {
          setStatus(error.message);
          openModal();
        }
      });
    });

    modal.querySelectorAll("[data-certificate-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    elements.saveButton?.addEventListener("click", async function () {
      if (!state.table || !elements.form) {
        return;
      }

      const payload = collectFormData(elements.form);
      setStatus("Salvando no PostgreSQL...");

      try {
        await requestJson(state.mode === "edit" && state.currentRowId ? `${rowsUrlBase}/certs/rows/${state.currentRowId}` : `${rowsUrlBase}/certs/rows`, {
          method: state.mode === "edit" && state.currentRowId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        setStatus("Certificado salvo. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.deleteButton?.addEventListener("click", async function () {
      if (!(state.mode === "edit" && state.currentRowId)) {
        return;
      }

      if (!window.confirm("Excluir este certificado?")) {
        return;
      }

      setStatus("Excluindo certificado...");

      try {
        await requestJson(`${rowsUrlBase}/certs/rows/${state.currentRowId}`, {
          method: "DELETE"
        });
        setStatus("Certificado excluido. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.uploadButton?.addEventListener("click", async function () {
      const file = elements.uploadFileInput?.files?.[0];
      if (!file) {
        setUploadResult("Escolha um arquivo.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", "certificates");
      setUploadResult("Enviando arquivo...");

      try {
        const data = await requestJson(uploadUrl, {
          method: "POST",
          body: formData
        });
        const fileInfo = data.file || {};
        if (fileInfo.filename) {
          if (!state.imageOptions.includes(fileInfo.filename)) {
            state.imageOptions.push(fileInfo.filename);
            state.imageOptions.sort((left, right) => left.localeCompare(right));
          }
          const imageField = elements.form?.querySelector('[data-column="Image"]');
          if (imageField) {
            const existingOption = Array.from(imageField.options || []).find((option) => option.value === fileInfo.filename);
            if (!existingOption) {
              const option = document.createElement("option");
              option.value = fileInfo.filename;
              option.textContent = fileInfo.filename;
              imageField.appendChild(option);
            }
            imageField.value = fileInfo.filename;
          }
        }
        setUploadResult(`Enviado: ${fileInfo.filename}`);
        elements.uploadFileInput.value = "";

        if (state.mode === "edit" && state.currentRowId && elements.form) {
          setStatus("Imagem enviada. Salvando certificado...");
          await saveTableRecord("certs", elements.form, setStatus, state.currentRowId);
          return;
        }
      } catch (error) {
        setUploadResult(error.message);
      }
    });
  }

  function initializeBadgeModal() {
    const modal = document.getElementById("badge-editor-modal");
    if (!modal) {
      return;
    }

    const elements = {
      title: document.getElementById("badge-editor-title"),
      status: document.getElementById("badge-editor-status"),
      form: document.getElementById("badge-editor-form"),
      saveButton: document.getElementById("badge-editor-save"),
      deleteButton: document.getElementById("badge-editor-delete"),
      uploadFileInput: document.getElementById("badge-editor-upload-file"),
      uploadButton: document.getElementById("badge-editor-upload-button"),
      uploadResult: document.getElementById("badge-editor-upload-result")
    };

    const state = {
      table: null,
      mode: "create",
      currentRowId: null,
      rows: [],
      imageOptions: []
    };

    function setStatus(message) {
      if (elements.status) {
        elements.status.textContent = message;
      }
    }

    function setUploadResult(message) {
      if (elements.uploadResult) {
        elements.uploadResult.textContent = message;
      }
    }

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }

    async function ensureBadgeImages() {
      const data = await requestJson(`${assetsUrlBase}/badges`);
      state.imageOptions = data.files || [];
      return state.imageOptions;
    }

    async function renderForm(row) {
      if (!state.table || !elements.form) {
        return;
      }

      const currentRow = row || {};
      await ensureBadgeImages();
      elements.form.innerHTML = state.table.columns
        .map((column) => buildFieldMarkup(column, currentRow[column.name], "badge-editor", { imageOptions: state.imageOptions }))
        .join("");
      bindColorPreview(elements.form);
      if (elements.deleteButton) {
        elements.deleteButton.disabled = !(state.mode === "edit" && state.currentRowId);
      }
      if (elements.title) {
        elements.title.textContent = state.mode === "edit" ? "Editar badge" : "Adicionar badge";
      }
    }

    async function ensureBadgeTable() {
      if (state.table) {
        return state.table;
      }

      const data = await requestJson(metaUrl);
      state.table = (data.tables || []).find((table) => table.name === "badges") || null;
      if (!state.table) {
        throw new Error("Tabela de badges nao encontrada.");
      }
      return state.table;
    }

    async function loadRows() {
      const data = await requestJson(`${rowsUrlBase}/badges/rows`);
      state.rows = data.rows || [];
    }

    async function openCreateModal() {
      await ensureBadgeTable();
      state.mode = "create";
      state.currentRowId = null;
      await renderForm({});
      setStatus("Novo badge. Preencha os campos e salve.");
      setUploadResult("");
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      openModal();
    }

    async function openEditModal(rowId) {
      await ensureBadgeTable();
      await loadRows();
      const row = state.rows.find((item) => item.id === rowId);
      if (!row) {
        throw new Error("Badge nao encontrado.");
      }

      state.mode = "edit";
      state.currentRowId = rowId;
      await renderForm(row);
      setStatus("Editando badge selecionado.");
      setUploadResult("");
      if (elements.uploadFileInput) {
        elements.uploadFileInput.value = "";
      }
      openModal();
    }

    document.querySelectorAll("[data-badge-action='create']").forEach((button) => {
      button.addEventListener("click", async function () {
        setStatus("Carregando...");
        try {
          await openCreateModal();
        } catch (error) {
          setStatus(error.message);
          openModal();
        }
      });
    });

    document.querySelectorAll("[data-badge-action='edit']").forEach((button) => {
      button.addEventListener("click", async function () {
        const rowId = Number(this.dataset.badgeRowId);
        if (!Number.isFinite(rowId) || rowId <= 0) {
          return;
        }

        setStatus("Carregando...");
        try {
          await openEditModal(rowId);
        } catch (error) {
          setStatus(error.message);
          openModal();
        }
      });
    });

    modal.querySelectorAll("[data-badge-modal-close]").forEach((button) => {
      button.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    elements.saveButton?.addEventListener("click", async function () {
      if (!state.table || !elements.form) {
        return;
      }
      setStatus("Salvando no PostgreSQL...");

      try {
        await saveTableRecord("badges", elements.form, setStatus, state.mode === "edit" ? state.currentRowId : null);
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.deleteButton?.addEventListener("click", async function () {
      if (!(state.mode === "edit" && state.currentRowId)) {
        return;
      }

      if (!window.confirm("Excluir este badge?")) {
        return;
      }

      setStatus("Excluindo badge...");

      try {
        await requestJson(`${rowsUrlBase}/badges/rows/${state.currentRowId}`, {
          method: "DELETE"
        });
        setStatus("Badge excluido. Recarregando a pagina...");
        window.location.reload();
      } catch (error) {
        setStatus(error.message);
      }
    });

    elements.uploadButton?.addEventListener("click", async function () {
      const file = elements.uploadFileInput?.files?.[0];
      if (!file) {
        setUploadResult("Escolha um arquivo.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("target", "badges");
      setUploadResult("Enviando arquivo...");

      try {
        const data = await requestJson(uploadUrl, {
          method: "POST",
          body: formData
        });
        const fileInfo = data.file || {};
        if (fileInfo.filename) {
          if (!state.imageOptions.includes(fileInfo.filename)) {
            state.imageOptions.push(fileInfo.filename);
            state.imageOptions.sort((left, right) => left.localeCompare(right));
          }
          const imageField = elements.form?.querySelector('[data-column="Image"]');
          if (imageField) {
            const existingOption = Array.from(imageField.options || []).find((option) => option.value === fileInfo.filename);
            if (!existingOption) {
              const option = document.createElement("option");
              option.value = fileInfo.filename;
              option.textContent = fileInfo.filename;
              imageField.appendChild(option);
            }
            imageField.value = fileInfo.filename;
          }
        }
        setUploadResult(`Enviado: ${fileInfo.filename}`);
        elements.uploadFileInput.value = "";

        if (state.mode === "edit" && state.currentRowId && elements.form) {
          setStatus("Imagem enviada. Salvando badge...");
          await saveTableRecord("badges", elements.form, setStatus, state.currentRowId);
          return;
        }
      } catch (error) {
        setUploadResult(error.message);
      }
    });
  }

  initializePageEditor();
  initializeSkillModal();
  initializeCertificateModal();
  initializeBadgeModal();
})();
