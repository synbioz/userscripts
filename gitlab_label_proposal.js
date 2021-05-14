// ==UserScript==
// @name         Gitlab label proposal
// @namespace    https://www.synbioz.com/
// @version      0.3.0
// @description  Label proposal for gitlab
// @author       Martin Catty
// @include      /^https:\/\/git\.synbioz\.com/.*/issues/\d
// @icon         https://www.google.com/s2/favicons?domain=gitlab.com
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
  Array.prototype.compact = function() {
    return this.filter(x => x !== undefined && x !== null);
  };

  const states = [
    ["to do", "doing"],
    ["doing", "to validate::functionally"],
    ["to validate::functionally", ["to do", "to validate::technically"]],
    ["to validate::technically", "to deploy::staging"],
    ["to deploy::staging", "to deploy::production"]
  ];

  const header = `
      <div class="title hide-collapsed gl-mb-3">
        Labels proposal
      </div>
    `;

  const initialStates = states.map(node => node[0]);
  const transitions = new Map(states);
  const label = document.querySelector(".labels");
  const csrf = document.querySelector("meta[name=\"csrf-token\"]").getAttribute("content");

  function renderLabelsProposal() {
    const labelsToNodes = mapExistingLabelsToStates();
    const nextLabels = Array.from(labelsToNodes.keys()).map(label => transitions.get(label)).compact().flat();

    clearExistingLabelsProposal();

    const html = buildNextLabelsHTML(nextLabels);

    appendBlock(html);
    registerLabelsProposalListener(labelsToNodes);
  }

  function clearExistingLabelsProposal() {
    document.querySelectorAll(".labels-proposal").forEach(node => node.remove());
  }

  function registerLabelsProposalListener(labelsToNodes) {
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

            // remove existing labels
            labelsToNodes.forEach((nodes, key) => {
              // there can be 2 nodes (including the scope), we only need one,
              // they have the same parent
              const node = nodes[0];
              const cross = node.parentNode.nextElementSibling;

              if (cross) {
                const event = new Event("click");

                cross.dispatchEvent(event);
              }
            });
          }
        });
      });
    });
  }

  // Create a map from existing labels, using this form :
  // { "label" => [node1, node2] }
  function mapExistingLabelsToStates() {
    return Array.from(document.querySelectorAll(".labels .gl-label-text")).reduce((map, node) => {
      const sibling = node.nextElementSibling;
      let scope = "";

      if (sibling !== undefined && sibling !== null) {
        scope = "::" + sibling.textContent.trim();
      }

      const content = node.textContent.trim() + scope;

      // we don't want to keep track of label's node not part
      // of the states we are watching
      if (initialStates.includes(content)) {
        map.set(content, [node, sibling].compact());
      }

      return map;
    }, new Map());
  }

  function buildNextLabelsHTML(nextLabels) {
    return nextLabels.reduce((acc, label) => {
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
  }

  function appendBlock(html) {
    const block = document.createElement("div");

    block.className = "block labels-proposal";
    label.after(block);
    block.innerHTML = html;
  }

  // re-render proposal when labels change
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.target.classList.contains("issuable-show-labels")) {
        renderLabelsProposal();
      }
    }
  });

  observer.observe(label, { attributes: false, childList: true, subtree: true });

  renderLabelsProposal();
})();
