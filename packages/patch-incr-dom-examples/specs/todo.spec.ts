import { expect, test } from "@playwright/test";

test("TodoMVC App", async ({ page }) => {
	await page.goto("http://localhost:3000/todo");
	await expect(page.$$(".todo-list > li")).resolves.toHaveLength(13);
	await page
		.getByRole("textbox", { name: "What needs to be done?" })
		.fill("Test Item 1");
	await page
		.getByRole("textbox", { name: "What needs to be done?" })
		.press("Enter");
	await expect(page.$$(".todo-list > li")).resolves.toHaveLength(14);
	await expect(page.getByText("Test Item 1")).toBeVisible();
	await expect(page.getByText("11 items left!")).toBeVisible();
	await page.locator("li:nth-child(14) > .view > .toggle").check();
	await expect(page.getByText("10 items left!")).toBeVisible();
	await page.locator("li:nth-child(14) > .view > .toggle").uncheck();
	await expect(page.getByText("11 items left!")).toBeVisible();
	await page.getByText("Update app").dblclick();
	await page.getByRole("main").getByRole("textbox").dblclick();
	await page.getByRole("main").getByRole("textbox").fill("Updated Text Here");
	await page.getByRole("main").getByRole("textbox").press("Enter");
	await expect(page.getByText("Updated Text Here")).toBeVisible();
	await page.getByRole("link", { name: "Active" }).click();
	await expect(page.$$(".todo-list > li")).resolves.toHaveLength(11);
	await page.getByRole("link", { name: "Completed" }).click();
	await expect(page.$$(".todo-list > li")).resolves.toHaveLength(3);
	await page.getByRole("link", { name: "All" }).click();
	await expect(page.$$(".todo-list > li")).resolves.toHaveLength(14);
	await page.getByRole("button", { name: "Clear completed" }).click();
	await expect(page.$$(".todo-list > li")).resolves.toHaveLength(11);
});
