// ==UserScript==
// @name         Gitlab label proposal
// @namespace    https://www.synbioz.com/
// @version      0.1.0
// @description  Label proposal for gitlab
// @author       Martin Catty
// @include      /^https:\/\/git\.synbioz\.com/.*/issues/\d
// @icon         https://www.google.com/s2/favicons?domain=gitlab.com
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
  const states = [
    ["to do", "doing"],
    ["doing", "to validate::functionally"],
    ["to validate::functionally", "to validate::technically"],
    ["to validate::technically", "to deploy::staging"],
    ["to deploy::staging", "to deploy::production"]
  ];

  const transitions = new Map(states);
  const label = document.querySelector(".labels");

  const currentLabels = Array.from(document.querySelectorAll(".labels .gl-label-text")).map(node => {
    const sibling = node.nextElementSibling;
    let scope = "";

    // In case of a scoped label, like to validate::functionally we need to get the scope
    // from the next sibling
    if (sibling !== undefined && sibling !== null) {
      scope = "::" + sibling.textContent.trim();
    }

    return node.innerHTML.trim() + scope;
  });

  const nextLabels = currentLabels.map(label => transitions.get(label)).filter(x => x !== undefined);

  const header = `
      <div class="title hide-collapsed gl-mb-3">
        Labels proposal
      </div>
    `;

  const html = nextLabels.reduce((acc, label) => {
    acc += `
          <div class="hide-collapsed value issuable-show-labels js-value has-labels">
            <span data-qa-selector="selected_label_content" data-qa-label-name="to do" class="gl-label gl-label-text-light"
              style="--label-background-color:#D10069; --label-inset-border:inset 0 0 0 2px #D10069;">
              <a href="#" class="gl-link gl-label-link">
                <span class="gl-label-text label-proposal">
                  ${label}
                </span>
              </a>
            </span>
          </div>
        `;

    return acc;
  }, header);

  const block = document.createElement("div");

  block.className = "block";
  label.after(block);
  block.innerHTML = html;

  const csrf = document.querySelector("meta[name=\"csrf-token\"]").getAttribute("content");

  document.querySelectorAll(".label-proposal").forEach(node => {
    node.addEventListener("click", event => {
      event.preventDefault();

      const label = event.target.textContent.trim();
      const url = `/api/v4/projects/${document.body.dataset.projectId}/issues/${document.body.dataset.pageTypeId}?add_labels=${encodeURIComponent(label)}`;

      const headers = new Headers({
        "Content-Type": "application/json",
        "x-csrf-token": csrf,
        Accept: "application/json"
      });

      fetch(url, {
        method: "PUT",
        headers: headers,
        withCredentials: true
      }).then(response => {
        if (response.ok) {
          node.remove();
        }
      });
    });
  });
})();
