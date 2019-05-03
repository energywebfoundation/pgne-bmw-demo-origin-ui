// Copyright 2018 Energy Web Foundation
//
// This file is part of the Origin Application brought to you by the Energy Web Foundation,
// a global non-profit organization focused on accelerating blockchain technology across the energy sector, 
// incorporated in Zug, Switzerland.
//
// The Origin Application is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// This is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY and without an implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details, at <http://www.gnu.org/licenses/>.
//
// @authors: slock.it GmbH, Heiko Burkhardt, heiko.burkhardt@slock.it
// tslint:disable-next-line:missing-jsdoc
import * as React from 'react'

import { ProducingAsset, User, AssetType, Certificate } from 'ewf-coo'
import { Web3Service } from '../utils/Web3Service'
import { Redirect } from 'react-router-dom'
import { Table } from '../elements/Table/Table'
import TableUtils from '../elements/utils/TableUtils'

export interface ProducingAssetTableProps {
    web3Service: Web3Service,
    certificates: Certificate[],
    producingAssets: ProducingAsset[],
    currentUser: User,
    baseUrl: string,
    switchedToOrganization: boolean
}

export interface ProducingAssetTableState {
    enrichedProducingAssetData: EnrichedProducingAssetData[],
    detailViewForAssetId: number
}

export interface EnrichedProducingAssetData {
    producingAsset: ProducingAsset,
    organizationName: string,
    notSoldCertificates: Certificate[]
}

export class ProducingAssetTable extends React.Component<ProducingAssetTableProps, {}> {

    state: ProducingAssetTableState

    constructor(props) {
        super(props)

        this.state = {
            enrichedProducingAssetData: [],
            detailViewForAssetId: null
        }

        this.switchToOrganization = this.switchToOrganization.bind(this)
        this.operationClicked = this.operationClicked.bind(this)

    }

    switchToOrganization(switchedToOrganization: boolean) {
        this.setState({
            switchedToOrganization: switchedToOrganization
        })
    }

    async componentDidMount() {
        await this.getOrganizationNames(this.props)
    }

    async componentWillReceiveProps(newProps: ProducingAssetTableProps) {
        await this.getOrganizationNames(newProps)
    }

    async getOrganizationNames(props: ProducingAssetTableProps) {
        const promises = props.producingAssets.map(async (producingAsset: ProducingAsset) => {
            const user = new User(producingAsset.owner, props.web3Service.blockchainProperties);

            await user.syncWithBlockchain();         

            return ({
                producingAsset,
                notSoldCertificates: this.props.certificates.filter((certificate: Certificate) => certificate.owner === producingAsset.owner && certificate.assetId === producingAsset.id),
                organizationName: user.organization
            });
        })

        const enrichedProducingAssetData = await Promise.all(promises);
        
        this.setState({
            enrichedProducingAssetData
        });
    }

    operationClicked(key: string, id: number) {
        this.setState({
            detailViewForAssetId: id
        })

    }

    render() {
        if (this.state.detailViewForAssetId !== null) {
            return <Redirect push to={'/' + this.props.baseUrl + '/assets/producing_detail_view/' + this.state.detailViewForAssetId} />
        }

        const defaultWidth = 106
        const generateHeader = (label, width = defaultWidth, right = false, body = false) => (TableUtils.generateHeader(label, width, right, body))
        const generateFooter = TableUtils.generateFooter

        const TableHeader = [
            generateHeader('#', 137.11),
            generateHeader('Owner', 136),
            generateHeader('State', 136),
            generateHeader('Type', 72),
            generateHeader('Incremental Credits (µg)', 137.39, true),
            generateHeader('Total Charge (kWh)', 137.39, true, true)
        ]

        const TableFooter = [
            {
                label: 'Total',
                key: 'total',
                colspan: 4
            },
            generateFooter('Incremental Credits (µg)'),
            generateFooter('Total Charge (kWh)')
        ]

        let totalSold = 0
        let totalNotSold = 0

        const accumulatorCb = (accumulator, currentValue) => accumulator + currentValue

        const filteredEnrichedAssetData = this.state.enrichedProducingAssetData.filter((enrichedProducingAssetData: EnrichedProducingAssetData) => {

            return !this.props.switchedToOrganization || enrichedProducingAssetData.producingAsset.owner === this.props.currentUser.accountAddress

        })

        let data = []
        data = filteredEnrichedAssetData.map((enrichedProducingAssetData: EnrichedProducingAssetData) => {
            const producingAsset = enrichedProducingAssetData.producingAsset
            const generatedKWh = producingAsset.certificatesCreatedForWh / 1000
            const kWhForSale = enrichedProducingAssetData.notSoldCertificates.length < 1 ? 0 : enrichedProducingAssetData.notSoldCertificates
                .map((certificate: Certificate) => certificate.powerInW)
                .reduce(accumulatorCb) / 1000

            totalSold += generatedKWh - kWhForSale
            totalNotSold += kWhForSale

            return ([
                producingAsset.id,
                enrichedProducingAssetData.organizationName,
                producingAsset.country,
                'Incremental Smart Charging',
                (producingAsset.cO2UsedForCertificate / 100000000000000).toFixed(0),
                generatedKWh.toFixed(3)

            ])

        })

        const operations = ['Show Details']

        return <div className='ProductionWrapper'>
            <Table header={TableHeader} footer={TableFooter} operationClicked={this.operationClicked} actions={true} data={data} operations={operations} />
        </div>
    }

}