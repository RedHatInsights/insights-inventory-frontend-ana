/**
 * The file contains the tests relevant to the Inventory table (/inventory).
 * The tests for the federal module are implemented in another cy spec.
 */

import {
    featureFlagsInterceptors,
    groupsInterceptors,
    hostsInterceptors,
    systemProfileInterceptors
} from '../../cypress/support/interceptors';
import Inventory from './InventoryTable';
import hostTagsFixtures from '../../cypress/fixtures/hostsTags.json';
import tagsFixtures from '../../cypress/fixtures/tags.json';
import hostsFixtures from '../../cypress/fixtures/hosts.json';
import groupsFixtures from '../../cypress/fixtures/groups.json';

import {
    DROPDOWN,
    DROPDOWN_ITEM,
    MODAL,
    ROW
} from '@redhat-cloud-services/frontend-components-utilities';

const mountTable = () => {
    cy.mountWithContext(Inventory);
};

const waitForTable = (waitNetwork = false) => {
    if (waitNetwork) {
    // required for correct requests verifying in sub tests
        cy.wait('@getHosts');
    }

    // indicating the table is loaded
    cy.get('table[aria-label="Host inventory"]').should(
        'have.attr',
        'data-ouia-safe',
        'true'
    );
};

before(() => {
    cy.mockWindowChrome();
});

describe('test data', () => {
    it('first host is in a group', () => {
        expect(hostsFixtures.results[0].groups.length > 0).to.be.true;
    });

    it('the second host is not in a group', () => {
        expect(hostsFixtures.results[1].groups.length === 0).to.be.true;
    });
});

describe('inventory table', () => {
    beforeEach(() => {
        cy.intercept(/\/api\/inventory\/v1\/hosts\/.*\/tags.*/, {
            statusCode: 200,
            body: hostTagsFixtures
        });
        cy.intercept('/api/inventory/v1/tags*', {
            statusCode: 200,
            body: tagsFixtures
        });
        featureFlagsInterceptors.successful();
        systemProfileInterceptors['operating system, successful empty']();
        groupsInterceptors['successful with some items']();
        hostsInterceptors.successful();
        mountTable();
        waitForTable();
    });

    describe('has groups actions', () => {
        it('cannot add host to another group', () => {
            cy.get(ROW).eq(1).find(DROPDOWN).click();
            cy.get(DROPDOWN_ITEM)
            .contains('Add to group')
            .should('have.attr', 'aria-disabled', 'true');
        });

        it('cannot remove host without group', () => {
            cy.get(ROW).eq(2).find(DROPDOWN).click();
            cy.get(DROPDOWN_ITEM)
            .contains('Remove from group')
            .should('have.attr', 'aria-disabled', 'true');
        });

        it('can remove from a group', () => {
            cy.intercept(
                'DELETE',
        `/api/inventory/v1/groups/${hostsFixtures.results[0].groups[0].id}/hosts/${hostsFixtures.results[0].id}`
            ).as('request');
            cy.get(ROW).eq(1).find(DROPDOWN).click();
            cy.get(DROPDOWN_ITEM).contains('Remove from group').click();
            cy.get(MODAL).within(() => {
                cy.get('h1').should('have.text', 'Remove from group');
                cy.get('button[type="submit"]').click();
                cy.wait('@request');
            });
        });

        it('can add to existing group', () => {
            cy.intercept('POST',
            `/api/inventory/v1/groups/${groupsFixtures.results[0].id}/hosts/${hostsFixtures.results[1].id}`
            ).as('request');
            cy.get(ROW).eq(2).find(DROPDOWN).click();
            cy.get(DROPDOWN_ITEM).contains('Add to group').click();
            cy.get(MODAL).within(() => {
                cy.get('h1').should('have.text', 'Add to group');
                cy.wait('@getGroups');
                cy.get('.pf-c-select__toggle').click(); // TODO: implement ouia selector for this component
                cy.get('.pf-c-select__menu-item').eq(0).click();
                cy.get('button[type="submit"]').click();
                cy.wait('@request');
            });
        });
    });
});