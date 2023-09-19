export class NodeRoom {
  name: string;
  hostId: string;
  guestIds: string[];

  constructor(name: string) {
    this.name = name;
    this.hostId = "";
    this.guestIds = [];
  }

  SetHostId(id: string) {
    this.hostId = id;
  }

  AddGuestId(id: string) {
    this.guestIds.push(id);
  }
  RemoveGuestId(id: string) {
    const index = this.guestIds.indexOf(id);
    if (index !== -1) {
      this.guestIds.splice(index, 1);
    }
  }
}
