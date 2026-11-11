import type { Locator, Page } from "@playwright/test";
import type { RoomInput } from "../api/schemas";

type NewRoom = Pick<RoomInput, "roomName" | "type" | "accessible" | "roomPrice" | "features">;

/** Admin room management at /admin/rooms: the room list and the "create room" row. */
export class AdminRoomsPage {
  readonly logoutButton: Locator;
  readonly createButton: Locator;
  readonly formErrors: Locator;
  private readonly roomNameInput: Locator;
  private readonly typeSelect: Locator;
  private readonly accessibleSelect: Locator;
  private readonly priceInput: Locator;

  constructor(private readonly page: Page) {
    this.logoutButton = page.getByRole("button", { name: "Logout" });
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
    // The error box has no role, label or test id (its role="alert" sibling stays empty).
    // lootfilter-disable-next-line LOC-001
    this.formErrors = page.locator(".alert-danger");
  }

  async open(): Promise<void> {
    await this.page.goto("/admin/rooms");
  }

  /** Fills the fields given (others keep the form's defaults) and submits. */
  async createRoom(room: Partial<NewRoom>): Promise<void> {
    if (room.roomName !== undefined) await this.roomNameInput.fill(room.roomName);
    if (room.type !== undefined) await this.typeSelect.selectOption(room.type);
    if (room.accessible !== undefined) {
      await this.accessibleSelect.selectOption(String(room.accessible));
    }
    if (room.roomPrice !== undefined) await this.priceInput.fill(String(room.roomPrice));
    for (const feature of room.features ?? []) await this.featureCheckbox(feature).check();
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
