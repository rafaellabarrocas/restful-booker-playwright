import type { Locator, Page } from "@playwright/test";
import type { RoomInput } from "../api/schemas";

type NewRoom = Pick<RoomInput, "roomName" | "type" | "accessible" | "roomPrice" | "features">;

/** Admin room management at /admin/rooms: the room list and the "create room" row. */
export class AdminRoomsPage {
  readonly logoutButton: Locator;
  readonly formError: Locator;
  private readonly roomNameInput: Locator;
  private readonly typeSelect: Locator;
  private readonly accessibleSelect: Locator;
  private readonly priceInput: Locator;
  private readonly createButton: Locator;

  constructor(private readonly page: Page) {
    this.logoutButton = page.getByRole("button", { name: "Logout" });
    this.formError = page.getByRole("alert").filter({ hasText: /\S/ });
    // The create-room inputs have no labels (an accessibility defect), so they are found
    // by the options they offer, or by their test id when they have nothing else.
    this.roomNameInput = page.getByTestId("roomName");
    this.typeSelect = page
      .getByRole("combobox")
      .filter({ has: page.getByRole("option", { name: "Suite", exact: true }) });
    this.accessibleSelect = page
      .getByRole("combobox")
      .filter({ has: page.getByRole("option", { name: "true", exact: true }) });
    // Unlabelled input with no accessible name and no test id: CSS is the only handle.
    // lootfilter-disable-next-line LOC-001
    this.priceInput = page.locator("#roomPrice");
    this.createButton = page.getByRole("button", { name: "Create" });
  }

  async open(): Promise<void> {
    await this.page.goto("/admin/rooms");
  }

  async createRoom(room: NewRoom): Promise<void> {
    await this.roomNameInput.fill(room.roomName);
    await this.typeSelect.selectOption(room.type);
    await this.accessibleSelect.selectOption(String(room.accessible));
    await this.priceInput.fill(String(room.roomPrice));
    for (const feature of room.features) await this.featureCheckbox(feature).check();
    await this.createButton.click();
  }

  async logOut(): Promise<void> {
    await this.logoutButton.click();
  }

  /** The listing row of a room, found by its (unique) name. */
  roomRow(roomName: string): Locator {
    return this.page.getByTestId("roomlisting").filter({ hasText: roomName });
  }

  private featureCheckbox(feature: string): Locator {
    return this.page.getByRole("checkbox", { name: feature, exact: true });
  }
}
