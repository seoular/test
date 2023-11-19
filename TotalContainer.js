import "./styles.css";
import React, { useState, useEffect } from "react";
import { PlayerPosMap, slotcodes } from "./constants";
import SangTable from "./SangTable";
import {isFetchable} from './util';

function TotalContainer() {
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [playerList, setPlayerList] = useState([]);
  const [playerDPCountMap, setPlayerDPCountMap] = useState(new Map())
  const [playerMap, setPlayerMap] = useState(new Map())
  const [selectedMode, setSelectedMode] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState(11);

  // console.log(isFetchable('https://raw.githubusercontent.com/seoular/test/main/bovada5'))

  const scrapeEspnStats = async (week) => {
    //https://fantasy.espn.com/apis/v3/games/ffl/seasons/2023/segments/0/leagues/995547?view=mMatchup&view=mMatchupScore
    const getUrl =
      "https://raw.githubusercontent.com/seoular/OddsVis/main/ESPNAPIFiles/latestHppr"
    // we may need to return to this but currently just use the latest one as it has past history as well
    //  "https://raw.githubusercontent.com/seoular/OddsVis/main/ESPNAPIFiles/week" + week + "hppr";

    await fetch(getUrl)
      .then((response) => {
        return response.json();
      })
      .then((r) => {
        let data = [];
        const d = r;
        for (const tm of d.teams) {
          const tmid = tm.id;
          for (const p of tm.roster.entries) {
            const name = p.playerPoolEntry.player.fullName;
            const slot = p.lineupSlotId;
            const pos = slotcodes[slot];

            // Injured status (need try/catch because of D/ST)
            let inj = "NA";
            try {
              inj = p.playerPoolEntry.player.injuryStatus;
            } catch (error) {
              // Do nothing, leave 'NA' as the default value for injured status
            }

            // Projected/actual points
            let proj = null,
              act = null;

            for (const stat of p.playerPoolEntry.player.stats) {
              if (stat.scoringPeriodId !== week) {
                continue;
              }
              if (stat.statSourceId === 0) {
                act = stat.appliedTotal;
              } else if (stat.statSourceId === 1) {
                proj = stat.appliedTotal;
              }
            }

            data.push([week, tmid, name, slot, pos, inj, proj, act]);
            playerMap.set(name, {
              proj: proj?.toFixed(2),
              act: act?.toFixed(2)
            });
          }
        }

      }).catch((e) => {
        playerMap.clear()
      });
    setPlayerMap(playerMap)
  };

  const scrapeData = async (pos, mode, week) => {
    const sangPProps = new Map();
    const dpCountMap = new Map();

    let receptionMultiplier = .5;


    if(mode == 0)
      receptionMultiplier = .5;
    else if(mode == 1)
      receptionMultiplier = 0;
    else if (mode == 2)
      receptionMultiplier = 1;

      //https://www.bovada.lv/services/sports/event/v2/events/A/description/football/nfl
    var getUrl = 'https://raw.githubusercontent.com/seoular/test/main/bovada6'
      //'https://raw.githubusercontent.com/seoular/OddsVis/main/BovadaAPIFiles/week' + week;
      
    let testedInts = 5;
    let lastTestedInt = 5;
    let sangFlag = false;

    while(await isFetchable('https://raw.githubusercontent.com/seoular/test/main/bovada' + testedInts)){
      console.log('loop hit' + testedInts + lastTestedInt)
      if(testedInts > lastTestedInt){
        sangFlag = true;        
        lastTestedInt++;
      }
      await fetch('https://raw.githubusercontent.com/seoular/test/main/bovada' + testedInts)
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          let allNflGames = data[0].events.slice();
          
          for (let i = 0; i < allNflGames.length; i++) {
            let eachGameTDOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-1870")
              ?.markets.find(
                (y) =>
                  y.descriptionKey == "Anytime Touchdown Scorer" &&
                  y.period.id == "119"
              )?.outcomes;
            let eachGameRushingOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-93")
              ?.markets.filter((y) => y.marketTypeId == "121337");
            let eachGameReceivingOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-94")
              ?.markets.filter((y) => y.marketTypeId == "121333");
            let eachGameReceptionOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-94")
              ?.markets.filter((y) => y.marketTypeId == "121332");
            let eachGamePassingYdOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-1188")
              ?.markets.filter((y) => y.marketTypeId == "121348");
            let eachGamePassingTDOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-1188")
              ?.markets.filter((y) => y.marketTypeId == "121335");
            let eachGameIntOutcomes = allNflGames[i].displayGroups
              .find((x) => x.id == "100-1188")
              ?.markets.filter((y) => y.marketTypeId == "121329");
            if (typeof eachGameTDOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameTDOutcomes.length; j++) {
                let playerOdds = eachGameTDOutcomes[j];

                if(playerOdds.description == 'CJ Stroud' ||playerOdds.description ==  'C.J. Stroud'){
                  console.log(playerOdds.description + ' td outcomes ' + (1 / playerOdds.price.decimal) * 6)
                }
                if(playerOdds.description == 'Amon-Ra St.Brown'  || playerOdds.description == 'Amon-Ra St. Brown'){
                  playerOdds.description = 'Amon-Ra St. Brown'
                  // console.log((1 / playerOdds.price.decimal) * 6)
                }
                if( !amonRaFlag ) {
                  if(sangFlag && sangPProps.has(playerOdds.description)){
                    //compare to past value future functionality
                    sangPProps.delete(playerOdds.description)
                    dpCountMap.delete(playerOdds.description)
                    
                    sangFlag = false;
                  }
                  sangPProps.set(
                    playerOdds.description,
                    (1 / playerOdds.price.decimal) * 6
                  );
    
                  dpCountMap.set(
                    playerOdds.description,
                    1
                  )
                }

                if (name == 'Amon-Ra St. Brown'){
                  amonRaFlag = true;
                }
                
              }
            }
            if (typeof eachGameRushingOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameRushingOutcomes.length; j++) {
                let playerOdds = eachGameRushingOutcomes[j];
                let name = playerOdds.description.slice(22);
                if(name == 'CJ Stroud' ||name ==  'C.J. Stroud'){
                  console.log(name + ' rush outcomes ' + playerOdds.outcomes[0].price.handicap / 10)
                }
                if(name == 'Amon-Ra St.Brown'  || name == 'Amon-Ra St. Brown'){
                  name = 'Amon-Ra St. Brown'
                }
                let temp = sangPProps.get(name);
                if (typeof temp == "undefined") {
                  temp = 0;
                } 
                if( !amonRaFlag ) {

                  if(sangFlag && sangPProps.has(name)){
                    //compare to past value future functionality
                    sangPProps.delete(name)
                    dpCountMap.delete(name)
                    
                    sangFlag = false;
                  }
                  sangPProps.set(
                    name,
                    temp + playerOdds.outcomes[0].price.handicap / 10
                  );             

                  let tempCount = dpCountMap.get(name);
                  if( typeof tempCount == "undefined"){
                    tempCount = 0;
                  }

                  dpCountMap.set(
                    name,
                    tempCount + 1
                  )
                }
                if (name == 'Amon-Ra St. Brown'){
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGameReceivingOutcomes !== "undefined") {
              let amonRaFlag = false;
              for (let j = 0; j < eachGameReceivingOutcomes.length; j++) {
                let playerOdds = eachGameReceivingOutcomes[j];
                let name = playerOdds.description.slice(24);
                if(name == 'CJ Stroud' || name == 'C.J. Stroud'){
                  console.log(name + ' recyd outcomes ' + playerOdds.outcomes[0].price.handicap / 10)
                }
                if(name == 'Amon-Ra St.Brown'  || name == 'Amon-Ra St. Brown'){
                  name = 'Amon-Ra St. Brown'
                  // console.log(playerOdds.outcomes[0].price.handicap / 10)
                }
                let temp = sangPProps.get(name);
                if (typeof temp == "undefined") {
                  temp = 0;
                }
                if( !amonRaFlag ) {
                  if(sangFlag && sangPProps.has(name)){
                    //compare to past value future functionality
                    sangPProps.delete(name)
                    dpCountMap.delete(name)
                    sangFlag = false;
                  }
                  sangPProps.set(
                    name,
                    temp + playerOdds.outcomes[0].price.handicap / 10
                  );

                  let tempCount = dpCountMap.get(name);
                  if( typeof tempCount == "undefined"){
                    tempCount = 0;
                  }

                  dpCountMap.set(
                    name,
                    tempCount + 1
                  )
                }
                if (name == 'Amon-Ra St. Brown'){
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGameReceptionOutcomes !== "undefined") {
              let amonRaFlag = false;

              for (let j = 0; j < eachGameReceptionOutcomes.length; j++) {
                let playerOdds = eachGameReceptionOutcomes[j];
                let name = playerOdds.description.slice(19);
                if(name == 'CJ Stroud' || name == 'C.J. Stroud'){
                  console.log(name + ' reception outcomes ' + playerOdds.outcomes[0].price.handicap * receptionMultiplier)
                }
                if(name == 'Amon-Ra St.Brown'  || name == 'Amon-Ra St. Brown'){
                  name = 'Amon-Ra St. Brown'
                  // console.log(playerOdds.outcomes[0].price.handicap * receptionMultiplier)
                } 
                let temp = sangPProps.get(name);

                if (typeof temp == "undefined") {
                  temp = 0;
                }
                if( !amonRaFlag ) {
                  if(sangFlag && sangPProps.has(name)){
                    //compare to past value future functionality
                    sangPProps.delete(name)
                    dpCountMap.delete(name)
                    sangFlag = false;
                  }
                  sangPProps.set(
                    name,
                    temp + playerOdds.outcomes[0].price.handicap * receptionMultiplier
                  );

                  let tempCount = dpCountMap.get(name);
                  if( typeof tempCount == "undefined"){
                    tempCount = 0;
                  }

                  dpCountMap.set(
                    name,
                    tempCount + 1
                  )
                }

                if (name == 'Amon-Ra St. Brown'){                
                  amonRaFlag = true;
                }
              }
            }
            if (typeof eachGamePassingYdOutcomes !== "undefined") {
              for (let j = 0; j < eachGamePassingYdOutcomes.length; j++) {
                let playerOdds = eachGamePassingYdOutcomes[j];
                let name = playerOdds.description.slice(22);
                if(name == 'CJ Stroud' || name == 'C.J. Stroud'){
                  console.log(name + ' passyd outcomes ' + playerOdds.outcomes[0].price.handicap / 25)
                }
                let temp = sangPProps.get(name);
                if (typeof temp == "undefined") {
                  temp = 0;
                }
                if(sangFlag && sangPProps.has(name)){
                  //compare to past value future functionality
                  sangPProps.delete(name)
                  dpCountMap.delete(name)
                  sangFlag = false;
                }
                sangPProps.set(
                  name,
                  temp + playerOdds.outcomes[0].price.handicap / 25
                );

                let tempCount = dpCountMap.get(name);
                if( typeof tempCount == "undefined"){
                  tempCount = 0;
                }

                dpCountMap.set(
                  name,
                  tempCount + 1
                )
              }
            }
            if (typeof eachGamePassingTDOutcomes !== "undefined") {
              for (let j = 0; j < eachGamePassingTDOutcomes.length; j++) {
                let playerOdds = eachGamePassingTDOutcomes[j];
                let name = playerOdds.description.slice(27);
                if(name == 'CJ Stroud' || name == 'C.J. Stroud'){
                  console.log(name + ' passtd outcomes ' + playerOdds.outcomes[0].price.handicap * 4)
                }
                let temp = sangPProps.get(name);
                if (typeof temp == "undefined") {
                  temp = 0;
                }
                if(sangFlag && sangPProps.has(name)){
                  //compare to past value future functionality
                  sangPProps.delete(name)
                  dpCountMap.delete(name)
                  sangFlag = false;
                }
                sangPProps.set(
                  name,
                  temp + playerOdds.outcomes[0].price.handicap * 4
                );

                let tempCount = dpCountMap.get(name);
                if( typeof tempCount == "undefined"){
                  tempCount = 0;
                }

                dpCountMap.set(
                  name,
                  tempCount + 1
                )
              }
            }
            if (typeof eachGameIntOutcomes !== "undefined") {
              for (let j = 0; j < eachGameIntOutcomes.length; j++) {
                let playerOdds = eachGameIntOutcomes[j];
                let name = playerOdds.description.slice(29);
                if(name == 'CJ Stroud' || name ==  'C.J. Stroud'){
                  console.log(name + ' int outcomes ' + playerOdds.outcomes[0].price.handicap * -2)
                  console.log(sangPProps.has(name) + ' ' +  sangFlag)
                }
                let temp = sangPProps.get(name);
                if (typeof temp == "undefined") {
                  temp = 0;
                }
                if(sangFlag && sangPProps.has(name)){
                  //compare to past value future functionality
                  sangPProps.delete(name)
                  dpCountMap.delete(name)
                  sangFlag = false;
                }
                sangPProps.set(
                  name,
                  temp + playerOdds.outcomes[0].price.handicap * -2
                );
                if(name == 'CJ Stroud' || name ==  'C.J. Stroud'){
                  console.log('postcheck ' + sangPProps.has(name) + ' ' +  sangFlag)
                }
              }
            }
          }

          console.log(Array.from(dpCountMap.entries()).sort((a, b) => b[1] - a[1]))
          console.log(Array.from(sangPProps.entries()).sort((a, b) => b[1] - a[1]))

          const mapEntries = Array.from(sangPProps.entries());
          // Sort the array based on the numeric value (assuming values are numbers)
          mapEntries.sort((a, b) => b[1] - a[1]);
          // Create a new Map from the sorted array
          const sortedMap = new Map(mapEntries);
          let finalList = Array.from(sortedMap.entries()).filter(
            (x) =>
              typeof PlayerPosMap.get(x[0]) !== "undefined" &&
              (PlayerPosMap.get(x[0]) == pos || pos == 99 || (pos == 98 && PlayerPosMap.get(x[0]) !== 0))  &&
              x[1] > 5
          );

          setPlayerDPCountMap(dpCountMap)
          setPlayerList(finalList);
        });


      testedInts++;
      sangFlag = false;
    }
  };

  useEffect(() => {
    scrapeEspnStats(selectedWeek)
  }, [selectedWeek])
  useEffect(() => {
    scrapeData(selectedPosition, selectedMode, selectedWeek).catch(console.error);
  }, [selectedPosition, selectedMode, selectedWeek]); 
  

  const redirectToPatreon = () => {
    window.location.href = 'https://www.patreon.com/evProjecter';
  }

  return (
    <div>
      <div>    
        <div style={{display:'flex', marginLeft: '20px', marginBottom:'5px', marginTop:'15px'}}>           
           Fantasy Football Projections Powered by Vegas Player Props
        </div>   
        <div style={{display:'flex'}}>
          <select
            defaultValue={selectedPosition}
            onChange={(e) => {
              setSelectedPosition(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="0">QB</option>
            <option value="1">RB</option>
            <option value="2">WR</option>
            <option value="3">TE</option>
            <option value="98">FLEX</option>
            <option value="99">SUPERFLEX</option>
          </select>
          <select
            defaultValue={selectedMode}
            onChange={(e) => {
              setSelectedMode(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="0">Half PPR</option>
            <option value="1">Standard</option>
            <option value="2">Full PPR</option>
          </select>
          <select
            defaultValue={selectedWeek}
            onChange={(e) => {
              setSelectedWeek(parseInt(e.target.value));
            }}
            style={{ display: "flex", marginLeft: "20px" }}
          >
            <option value="11">Week 11</option>
            <option value="10">Week 10</option>
          </select>
        </div>
        <SangTable  evList={playerList} espnPlayerMap={playerMap} dpCountMap={playerDPCountMap} />
    
      
      </div>
      <div class="updateTimeSection" >
        EV values last updated Friday, 11/17 at 5:59pm ET
      </div>
      <div class="patreonSection">
        <div>
          Access the Pro version with extra statistical insight and future functionality by supporting my Patreon link below
        </div>
        <button class="button" onClick={(e) => {redirectToPatreon()}}><span>evProjecterPro</span></button>
      </div>
    </div>
  );
}

export default TotalContainer;
