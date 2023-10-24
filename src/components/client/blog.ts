import type { CollectionEntry } from "astro:content";

class BlogArticlesList extends HTMLElement {
    pageSize = 1;
    query = "";
    entries: CollectionEntry<"article">[]

    currentPage: number = 1;
    low: number = 0;
    high: number = 1;
    searchInputEl: HTMLInputElement | null;
    previousPageLinkEl: HTMLAnchorElement | null;
    nextPageLinkEl: HTMLAnchorElement | null;

    constructor() {
        super();
        const params = new URLSearchParams(document.location.search);

        this.searchInputEl = document.querySelector("input[type=search]");
        this.previousPageLinkEl = this.querySelector("a.previous-page-link");
        this.nextPageLinkEl = this.querySelector("a.next-page-link");

        this.query = params.get("query") || "";
        this.setCurrentPage(params.get("page"));

        if (!this.dataset.entries) throw new Error('Invalid articles entries');
        this.entries = JSON.parse(this.dataset.entries);

        if (this.searchInputEl) {
            this.searchInputEl.value = this.query;
            this.searchInputEl.onkeyup = () => {
                if (!this.searchInputEl) return;

                this.query = this.searchInputEl.value;
                this.setCurrentPage(1);

                this.render();
            };
        }

        this.render();
    }

    render() {
        const url = new URL(window.location.href);
        url.searchParams.set("query", this.query);
        url.searchParams.set("page", String(this.currentPage));
        history.pushState({}, '', url);

        this.renderEntries();
        this.renderPaginationButtons();
    }

    renderEntries() {
        this.entries.forEach((entry) => {
            const itemEl = this.querySelector<HTMLLIElement>(`li.${entry.slug}`);
            if (!itemEl) return;

            itemEl.style.display = "none";
        });

        this.entries
            .filter((entry) =>
                entry.data.title.toLowerCase().includes(this.query.toLowerCase())
            )
            .forEach((entry, index) => {
                const itemEl = this.querySelector<HTMLLIElement>(`li.${entry.slug}`);
                if (!itemEl) return;

                if (index < this.low || index >= this.high) {
                    itemEl.style.display = "none";
                    return;
                };

                itemEl.style.display = "list-item";
            });
    }

    renderPaginationButtons() {
        const entriesLength = this.entries.filter((entry) =>
            entry.data.title.toLowerCase().includes(this.query.toLowerCase())
        );

        if (this.nextPageLinkEl) {
            if ((this.currentPage + 1) * this.pageSize <= entriesLength.length)
                this.nextPageLinkEl.style.display = "unset";
            else this.nextPageLinkEl.style.display = "none";

            this.nextPageLinkEl.onclick = () => {
                this.setCurrentPage(this.currentPage + 1);
                this.render();
            };
        }

        if (this.previousPageLinkEl) {
            if (this.currentPage > 1)
                this.previousPageLinkEl.style.display = "unset";
            else this.previousPageLinkEl.style.display = "none";

            this.previousPageLinkEl.onclick = () => {
                this.setCurrentPage(this.currentPage - 1);
                this.render();
            };
        }
    }

    setCurrentPage(page: number | string | null) {
        this.currentPage = Number(page) || 1;
        this.low = (this.currentPage - 1) * this.pageSize;
        this.high = this.low + this.pageSize;
    }
}

customElements.define("blog-articles-list", BlogArticlesList);