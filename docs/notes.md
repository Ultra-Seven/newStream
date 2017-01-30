# Arch


Client

* query --> cache --> approx viz
* send mouse action distribution to server
  * location
  * action
* map mouse distribution to action distribution
  * (single step!) 
* different data structures DS
* Server 
  * allocates bytes for different (groups?) of queries
  * calls DS.get(# bytes, group) or DS.get(group) or DS.get(perc bandwidth, group)
  * "combines" the byte responses
  * sends back 

Viz

* splom?

Data structures

* naive cache of server fully computed query results
* naive cache of server online aggregation query results
* data cube tiles ala immens
* index?
* query engine, stream data samples to client

# Related

Viz

* prefetching/prediction

Gaming

* Outatime: Using Speculation to Enable Low-Latency Continuous Interaction for Mobile Cloud Gaming.
* Motion Prediction for Online Gaming Rynson W. H. LauAddison Chan
  * http://link.springer.com/chapter/10.1007/978-3-540-89220-5_11
* Streaming QSplat: A Viewer for Networked Visualization of Large, Dense Models
  * Szymon Rusinkiewicz Marc Levoy
  * http://dept-info.labri.u-bordeaux.fr/~bouatouc/Publi_ClientServ/Levoy/sqsplat_paper.pdf
  * tree data structure for 3d model, prioritized request queue for nodes in tree, stream back in that order





