export default class GameManager {
    constructor(scene) {
        this.scene = scene;
        this.state = {
            quest: "Habla con el guardia",
            inventory: []
        };
    }

    addItem(item) {
        this.state.inventory.push(item);
    }

    completeQuest() {
        this.state.quest = "Quest completada";
    }
}
