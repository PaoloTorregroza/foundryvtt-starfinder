import { ActorItemHelper, getChildItems } from "../../actor/actor-inventory.js"

export const ItemCapacityMixin = (superclass) => class extends superclass {
    /**
     * Checks if this item has capacity.
     */
    hasCapacity() {
        if (this.type === "starshipWeapon") {
            return (
                this.data.data.weaponType === "tracking"
                || this.data.data.special["mine"]
                || this.data.data.special["transposition"]
                || this.data.data.special["orbital"]
                || this.data.data.special["rail"]
                || this.data.data.special["forcefield"]
                || this.data.data.special["limited"]
            );
        }

        return (this.getMaxCapacity() > 0);
    }

    /**
     * Returns whether or not this item requires capacity items (typically ammunition) or not
     */
    requiresCapacityItem() {
        const itemData = this.data.data;
        return (this.type !== "ammunition" && itemData.ammunitionType);
    }

    getCapacityItem() {
        if (!this.requiresCapacityItem()) {
            return false;
        }

        // Create actor item helper
        const tokenId = this.actor.isToken ? this.actor.token.id : null;
        const sceneId = this.actor.isToken ? this.actor.token.parent.id : null;
        const itemHelper = new ActorItemHelper(this.actor.id, tokenId, sceneId);

        // Find child item
        const childItems = getChildItems(itemHelper, this);
        const loadedAmmunition = childItems.find(x => x.type === "ammunition");
        return loadedAmmunition;
    }

    /**
     * Returns the current capacity of the item.
     * Can return null if there is no capacity available.
     */
    getCurrentCapacity() {
        if (this.requiresCapacityItem()) {
            const capacityItem = this.getCapacityItem();
            return capacityItem?.getCurrentCapacity() || 0;
        }

        const itemData = this.data.data;
        if (this.type === "ammunition" && !this.data.data.useCapacity) {
            return itemData.quantity;
        } else {
            return itemData.capacity?.value;
        }
    }

    /**
     * Consumes some amount of capacity.
     */
    consumeCapacity(consumedAmount) {
        if (this.requiresCapacityItem()) {
            const capacityItem = this.getCapacityItem();
            return capacityItem?.consumeCapacity(consumedAmount);
        }

        // Attempt to retrieve current capacity. If it is null, exit early.
        const currentCapacity = this.getCurrentCapacity();
        if (!currentCapacity) {
            return;
        }

        const updatedCapacity = Math.max(0, currentCapacity - consumedAmount);

        if (this.type === "ammunition" && !this.data.data.useCapacity) {
            return this.update({'data.quantity': updatedCapacity});
        } else {
            return this.update({'data.capacity.value': updatedCapacity});
        }
    }

    /**
     * Returns the maximum capacity of the item.
     * Can return null if there is no maximum capacity.
     */
    getMaxCapacity() {
        if (this.type === "ammunition" && !this.data.data.useCapacity) {
            return null;
        }
        
        const itemData = this.data.data;
        const maxCapacity = itemData.capacity?.max;
        return maxCapacity;
    }

    /**
     * Attempts to reload the item's capacity.
     */
    reload() {
        const itemData = this.data.data;
        const currentCapacity = this.getCurrentCapacity();
        const maxCapacity = this.getMaxCapacity();

        if (currentCapacity >= maxCapacity && false) {
            // No need to reload if already at max capacity.
            return false;
        }

        let newCapacity = maxCapacity;
        if (this.requiresCapacityItem()) {
            const capacityItem = this.getCapacityItem();
            console.log(capacityItem);
        }
        /*if (this.type === "weapon") {
            if (itemData.ammunitionType === "charge") {
                // Find item matching ammunition type
                const matchingItems = this.actor.items
                    .filter(x => x.type === "ammunition" && x.data.data.ammunitionType === itemData.ammunitionType && x.getCurrentCapacity() > currentCapacity && x.getMaxCapacity() <= maxCapacity)
                    .sort((firstEl, secondEl) => secondEl.getCurrentCapacity() - firstEl.getCurrentCapacity() );
                
                if (matchingItems.length > 0) {
                    const itemId = matchingItems[0]._id;
                    const itemQuantity = matchingItems[0].data.quantity;
                    const itemCapacity = matchingItems[0].getCurrentCapacity();

                    newCapacity = itemCapacity;

                    // Step 1: Destroy old item
                    if (itemQuantity > 1) {
                        this.actor.updateEmbeddedDocuments("Item", [{"id": itemId, "data.quantity": itemQuantity - 1}]);
                    } else {
                        this.actor.deleteEmbeddedDocuments("Item", [itemId]);
                    }

                    // Step 2: Create new battery w/ old charge
                }
            } else {
                
            }
        }*/

        // Render the chat card template
        const templateData = {
            actor: this.actor,
            item: this,
            tokenId: this.actor.token?.id,
            action: "SFRPG.ChatCard.ItemActivation.Reloads",
            cost: game.i18n.format("SFRPG.AbilityActivationTypesMove")
        };

        const template = `systems/sfrpg/templates/chat/item-action-card.html`;
        const renderPromise = renderTemplate(template, templateData);
        renderPromise.then((html) => {
            // Create the chat message
            const chatData = {
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                content: html
            };

            ChatMessage.create(chatData, { displaySheet: false });
        });
        
        return this.update({'data.capacity.value': newCapacity});
    }
}