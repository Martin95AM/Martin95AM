export default class MainScene extends Phaser.Scene{

    constructor(){

        super("MainScene");

    }

    create(){

        this.cameras.main.setBackgroundColor("#2b9cff");

        this.add.text(

            300,
            240,
            "MARTIN QUEST",

            {

                fontSize:"42px",

                color:"#ffffff"

            }

        );

    }

}